"""
Generates structured quiz questions (MCQ, True/False, Fill-in-the-blank,
Coding) via a JSON-mode LLM call, from either uploaded note text or a
free-text topic.
"""
import uuid

from app.services.llm import MAX_NOTE_CONTEXT_CHARS, generate_json

QUIZ_SYSTEM_PROMPT = (
    "You are an AI study assistant that writes exam-style quiz questions. "
    "Respond with ONLY a JSON object (no prose outside the JSON) matching exactly this schema:\n"
    "{\n"
    '  "questions": [\n'
    "    {\n"
    '      "type": "mcq" | "true_false" | "fill_blank" | "coding",\n'
    '      "question": string,\n'
    '      "options": string[] (ONLY for type "mcq", exactly 4 options; omit/empty for other types),\n'
    '      "correctAnswer": string (for mcq: the exact matching option text; for true_false: "True" or "False"; '
    'for fill_blank: the expected word/phrase; for coding: a concise reference solution),\n'
    '      "explanation": string (1-2 sentences on why the answer is correct)\n'
    "    }\n"
    "  ]\n"
    "}\n"
    "Generate exactly the number and mix of questions requested by the user. "
    "Keep coding questions language-agnostic unless the source material specifies a language."
)


def _build_user_prompt(source_text: str, topic: str | None, difficulty: str, question_spec: dict[str, int]) -> str:
    spec_lines = [f"- {count} {qtype.replace('_', ' ')} question(s)" for qtype, count in question_spec.items() if count > 0]
    spec_block = "\n".join(spec_lines)

    header = f"Difficulty: {difficulty}\n\nQuestion mix:\n{spec_block}\n\n"

    if source_text:
        return header + f"Base the questions on this source material:\n\n{source_text[:MAX_NOTE_CONTEXT_CHARS]}"
    return header + f"Base the questions on this topic (use your own knowledge): {topic}"


async def generate_quiz_questions(
    *,
    source_text: str | None = None,
    topic: str | None = None,
    difficulty: str = "medium",
    question_spec: dict[str, int],
) -> list[dict]:
    if not source_text and not topic:
        raise ValueError("Either source_text or topic must be provided")

    user_prompt = _build_user_prompt(source_text or "", topic, difficulty, question_spec)
    total_questions = sum(question_spec.values())
    result = await generate_json(
        QUIZ_SYSTEM_PROMPT,
        user_prompt,
        max_tokens=min(4000, 400 + total_questions * 220),
    )

    questions = result.get("questions", [])
    normalized = []
    for q in questions:
        normalized.append(
            {
                "id": uuid.uuid4().hex[:8],
                "type": q.get("type", "mcq"),
                "question": q.get("question", "").strip(),
                "options": q.get("options") or [],
                "correctAnswer": str(q.get("correctAnswer", "")).strip(),
                "explanation": q.get("explanation", "").strip(),
            }
        )
    return normalized
