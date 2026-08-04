"""
Grades a submitted quiz attempt against its question set.

MCQ / True-False / Fill-in-the-blank are graded deterministically (normalized
string comparison) so scoring is instant and reproducible. Coding questions
are free-form, so they're graded by the LLM against the reference solution,
in a single batched call for efficiency.
"""
import re

from app.services.llm import generate_json

_WHITESPACE_RE = re.compile(r"\s+")


def _normalize(text: str) -> str:
    return _WHITESPACE_RE.sub(" ", text or "").strip().lower()


CODING_GRADER_SYSTEM_PROMPT = (
    "You are grading student answers to coding questions. For each question, "
    "compare the student's answer to the reference solution and judge whether "
    "it correctly solves the problem (minor style differences are fine; focus "
    "on correctness and logic). Respond with ONLY a JSON object:\n"
    '{ "results": [{"id": string, "isCorrect": boolean, "feedback": string}] }'
)


async def _grade_coding_questions(coding_items: list[dict]) -> dict[str, dict]:
    """coding_items: [{id, question, correctAnswer, userAnswer}]. Returns {id: {isCorrect, feedback}}."""
    if not coding_items:
        return {}

    lines = []
    for item in coding_items:
        lines.append(
            f"Question ID: {item['id']}\n"
            f"Question: {item['question']}\n"
            f"Reference solution: {item['correctAnswer']}\n"
            f"Student answer: {item['userAnswer'] or '(no answer given)'}\n"
        )
    user_prompt = "\n---\n".join(lines)

    result = await generate_json(CODING_GRADER_SYSTEM_PROMPT, user_prompt, max_tokens=1500)
    return {r["id"]: r for r in result.get("results", []) if "id" in r}


async def evaluate_answers(questions: list[dict], answers: dict[str, str]) -> dict:
    """
    questions: the quiz's stored question list (each has id, type, correctAnswer, explanation).
    answers: {questionId: userAnswerText}
    Returns: {
        "results": [{"questionId", "userAnswer", "correctAnswer", "isCorrect", "explanation"}],
        "score": int, "totalQuestions": int, "percentage": float
    }
    """
    coding_items = []
    prelim_results: dict[str, dict] = {}

    for q in questions:
        user_answer = answers.get(q["id"], "")
        if q["type"] == "coding":
            coding_items.append(
                {
                    "id": q["id"],
                    "question": q["question"],
                    "correctAnswer": q["correctAnswer"],
                    "userAnswer": user_answer,
                }
            )
        else:
            is_correct = _normalize(user_answer) == _normalize(q["correctAnswer"])
            prelim_results[q["id"]] = {"isCorrect": is_correct, "feedback": q.get("explanation", "")}

    coding_grades = await _grade_coding_questions(coding_items)

    results = []
    correct_count = 0
    for q in questions:
        user_answer = answers.get(q["id"], "")
        graded = coding_grades.get(q["id"]) if q["type"] == "coding" else prelim_results.get(q["id"])
        is_correct = bool(graded.get("isCorrect")) if graded else False
        feedback = graded.get("feedback") if graded else q.get("explanation", "")

        if is_correct:
            correct_count += 1

        results.append(
            {
                "questionId": q["id"],
                "question": q["question"],
                "type": q["type"],
                "userAnswer": user_answer,
                "correctAnswer": q["correctAnswer"],
                "isCorrect": is_correct,
                "explanation": feedback or q.get("explanation", ""),
            }
        )

    total = len(questions)
    percentage = round((correct_count / total) * 100, 1) if total else 0.0

    return {
        "results": results,
        "score": correct_count,
        "totalQuestions": total,
        "percentage": percentage,
    }
