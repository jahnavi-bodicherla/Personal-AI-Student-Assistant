"""
Generates a structured, multi-format study summary from uploaded note text
using a single JSON-mode LLM call.
"""
from app.services.llm import MAX_NOTE_CONTEXT_CHARS, generate_json

SUMMARY_SYSTEM_PROMPT = (
    "You are an AI study assistant that turns raw lecture/textbook notes into "
    "structured exam-prep material. Respond with ONLY a JSON object (no prose "
    "outside the JSON) matching exactly this schema:\n"
    "{\n"
    '  "shortSummary": string (2-4 sentences),\n'
    '  "detailedSummary": string (multiple paragraphs, Markdown allowed),\n'
    '  "examRevisionNotes": string (Markdown bullet list of high-yield revision points),\n'
    '  "keyPoints": string[] (5-12 concise bullet points),\n'
    '  "definitions": [{"term": string, "definition": string}] (important terms found in the notes),\n'
    '  "formulaSheet": string[] (formulas found in the notes, empty array if none apply),\n'
    '  "mindMap": string (a Markdown nested bullet list representing a text mind map of the topic hierarchy)\n'
    "}"
)


async def generate_note_summary(note_text: str) -> dict:
    trimmed = note_text[:MAX_NOTE_CONTEXT_CHARS]
    user_prompt = f"Generate the structured summary for these notes:\n\n{trimmed}"
    result = await generate_json(SUMMARY_SYSTEM_PROMPT, user_prompt, max_tokens=3000)

    # Defensive defaults in case the model omits an optional field.
    result.setdefault("keyPoints", [])
    result.setdefault("definitions", [])
    result.setdefault("formulaSheet", [])
    result.setdefault("mindMap", "")
    return result
