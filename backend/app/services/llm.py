"""
Thin wrapper around the OpenAI Chat Completions API.

Keeping this isolated in one module means the rest of the app (routers,
storage) never touches the OpenAI SDK directly - if the model/provider
changes later, only this file needs to change.
"""
import json

from openai import AsyncOpenAI, APIError, APIConnectionError, RateLimitError

from app.config import settings

_client: AsyncOpenAI | None = None


def get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        if not settings.OPENAI_API_KEY:
            raise RuntimeError(
                "OPENAI_API_KEY is not set. Add it to your .env file before using the chat feature."
            )

        _client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
        )

    return _client


SYSTEM_PROMPT = (
    "You are an AI Personal Study Assistant. You help students learn by "
    "explaining concepts clearly, answering academic and coding questions, "
    "solving problems step-by-step, and giving beginner-friendly examples. "
    "Use Markdown formatting: headings, bullet points, and fenced code blocks "
    "with a language tag (e.g. ```python) whenever you include code. Keep "
    "explanations structured and easy to follow."
)

# Uploaded notes can be long; keep a generous but bounded slice so prompts stay
# within the model's context window and costs stay predictable.
MAX_NOTE_CONTEXT_CHARS = 18000


class LLMServiceError(Exception):
    """Raised when the AI provider call fails, so routers can return a clean 502."""


async def generate_chat_reply(history: list[dict[str, str]]) -> str:
    """
    history: list of {"role": "user"|"assistant", "content": str}, oldest first.
    Returns the assistant's reply text.
    """
    client = get_client()
    messages = [{"role": "system", "content": SYSTEM_PROMPT}, *history]

    try:
        completion = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=1500,
        )
    except (APIError, APIConnectionError, RateLimitError) as exc:
        raise LLMServiceError(str(exc)) from exc

    reply = completion.choices[0].message.content
    if not reply:
        raise LLMServiceError("The AI model returned an empty response.")
    return reply.strip()


async def generate_json(system_prompt: str, user_prompt: str, max_tokens: int = 2500) -> dict:
    """
    Calls the model in JSON mode and returns a parsed dict. Used for anything
    that needs a structured result (summaries, quizzes) rather than free-form
    Markdown chat text.
    """
    client = get_client()
    try:
        completion = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.4,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
        )
    except (APIError, APIConnectionError, RateLimitError) as exc:
        raise LLMServiceError(str(exc)) from exc

    raw = completion.choices[0].message.content
    if not raw:
        raise LLMServiceError("The AI model returned an empty response.")

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise LLMServiceError(f"The AI model returned malformed JSON: {exc}") from exc


async def answer_from_context(note_text: str, question: str, history: list[dict[str, str]] | None = None) -> str:
    """
    Answers a question using ONLY the supplied note text as context (note-scoped Q&A).
    """
    trimmed_context = note_text[:MAX_NOTE_CONTEXT_CHARS]
    system_prompt = (
        "You are an AI study assistant answering questions about a specific set "
        "of uploaded notes. Answer using ONLY the information in the notes below. "
        "If the notes don't contain the answer, say so clearly instead of guessing. "
        "Use Markdown formatting and fenced code blocks with a language tag for any code.\n\n"
        f"--- NOTES START ---\n{trimmed_context}\n--- NOTES END ---"
    )
    client = get_client()
    messages = [{"role": "system", "content": system_prompt}, *(history or []), {"role": "user", "content": question}]

    try:
        completion = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            temperature=0.3,
            max_tokens=1200,
        )
    except (APIError, APIConnectionError, RateLimitError) as exc:
        raise LLMServiceError(str(exc)) from exc

    reply = completion.choices[0].message.content
    if not reply:
        raise LLMServiceError("The AI model returned an empty response.")
    return reply.strip()


def derive_title(first_user_message: str) -> str:
    """Generates a short conversation title from the first user message (no extra API call)."""
    cleaned = " ".join(first_user_message.split())
    return cleaned[:48] + ("…" if len(cleaned) > 48 else "")
