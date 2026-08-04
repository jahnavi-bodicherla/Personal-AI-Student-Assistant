"""
Handwritten notes -> text.

Scanned/photographed handwriting has no embedded text layer, so pypdf and
python-docx can't help here. Instead the image is sent to a vision-capable
model, which reads the handwriting and returns clean Markdown.

Kept separate from file_extraction.py because that module is synchronous and
purely local, while this one is async and makes a network call.
"""
import base64

from openai import APIConnectionError, APIError, RateLimitError

from app.config import settings
from app.services.llm import LLMServiceError, get_client

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}

_MIME_BY_EXTENSION = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
}

# A photo of a page is much larger than a text file but still one request, so
# the ceiling can be generous.
MAX_IMAGE_BYTES = 12 * 1024 * 1024

TRANSCRIPTION_PROMPT = (
    "This image is a page of handwritten student study notes. Transcribe every "
    "word of the handwriting into clean Markdown.\n\n"
    "Rules:\n"
    "- Transcribe only what is actually written. Never invent, complete, or "
    "correct the student's content.\n"
    "- Preserve the structure: headings stay headings, bullet lists stay bullet "
    "lists, numbered lists keep their numbers.\n"
    "- Render mathematical formulas in LaTeX between $ signs.\n"
    "- Put code or pseudocode in a fenced code block.\n"
    "- Describe diagrams briefly in italics, e.g. *[Diagram: labelled cell "
    "structure]*, rather than trying to draw them.\n"
    "- If a word is genuinely illegible, write [?] in its place instead of "
    "guessing.\n"
    "- Output only the transcription. No preamble, no commentary."
)


def is_image(filename: str) -> bool:
    return any(filename.lower().endswith(ext) for ext in IMAGE_EXTENSIONS)


def _mime_for(filename: str) -> str:
    lower = filename.lower()
    for extension, mime in _MIME_BY_EXTENSION.items():
        if lower.endswith(extension):
            return mime
    return "image/jpeg"


async def transcribe_handwriting(filename: str, file_bytes: bytes) -> str:
    """
    Returns the handwriting in the image as Markdown text.

    Raises LLMServiceError if the model call fails or the page yields nothing
    readable, so the router can turn it into a clean HTTP error.
    """
    if not file_bytes:
        raise LLMServiceError("The uploaded image is empty.")

    encoded = base64.b64encode(file_bytes).decode("ascii")
    data_uri = f"data:{_mime_for(filename)};base64,{encoded}"

    client = get_client()
    try:
        completion = await client.chat.completions.create(
            # A separate setting because the default chat model may have no
            # vision capability at all.
            model=settings.OPENAI_VISION_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": TRANSCRIPTION_PROMPT},
                        {"type": "image_url", "image_url": {"url": data_uri}},
                    ],
                }
            ],
            # Low temperature: this is transcription, not composition.
            temperature=0.1,
            max_tokens=3000,
        )
    except (APIError, APIConnectionError, RateLimitError) as exc:
        raise LLMServiceError(
            f"Handwriting recognition failed: {exc}. Check that "
            f"OPENAI_VISION_MODEL ('{settings.OPENAI_VISION_MODEL}') is a "
            "vision-capable model available at your configured base URL."
        ) from exc

    text = (completion.choices[0].message.content or "").strip()

    if not text:
        raise LLMServiceError(
            "No handwriting could be read from this image. Try a sharper, "
            "better-lit photo taken straight on."
        )

    # A near-empty result usually means a blank or unreadable page rather than
    # a genuinely tiny note.
    if len(text) < 15:
        raise LLMServiceError(
            "Almost no text was readable in this image. Try a sharper, "
            "better-lit photo taken straight on."
        )

    return text
