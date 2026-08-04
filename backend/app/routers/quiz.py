"""
AI Quiz Generator endpoints: generate a quiz from a note or a topic, submit
answers for grading, and view quiz history/scores.
"""
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.mongodb import get_database
from app.schemas.quiz import (
    QuizDetail,
    QuizGenerateRequest,
    QuizQuestionPublic,
    QuizResultResponse,
    QuizSubmitRequest,
    QuizSummary,
    QuestionResult,
)
from app.services.activity_tracker import log_activity
from app.services.llm import LLMServiceError
from app.services.quiz_evaluator import evaluate_answers
from app.services.quiz_generator import generate_quiz_questions
from app.utils.deps import get_current_user

router = APIRouter(prefix="/api/quiz", tags=["Quiz"])


def _to_object_id(raw_id: str, label: str = "id") -> ObjectId:
    try:
        return ObjectId(raw_id)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid {label}")


async def _get_owned_quiz(db: AsyncIOMotorDatabase, quiz_id: str, user_id: ObjectId) -> dict:
    doc = await db.quizzes.find_one({"_id": _to_object_id(quiz_id, "quiz id"), "userId": user_id})
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    return doc


def _quiz_to_summary(doc: dict) -> QuizSummary:
    return QuizSummary(
        id=str(doc["_id"]),
        title=doc["title"],
        subject=doc.get("subject"),
        difficulty=doc["difficulty"],
        totalQuestions=len(doc["questions"]),
        isCompleted=doc.get("isCompleted", False),
        score=doc.get("score"),
        percentage=doc.get("percentage"),
        createdAt=doc["createdAt"],
        completedAt=doc.get("completedAt"),
    )


@router.post("/generate", response_model=QuizDetail, status_code=status.HTTP_201_CREATED)
async def generate_quiz(
    payload: QuizGenerateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    if payload.questionSpec.total() < 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request at least one question.")
    if payload.questionSpec.total() > 25:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Max 25 questions per quiz.")

    source_text = None
    title = payload.topic or "Quiz"

    if payload.noteId:
        note = await db.notes.find_one({"_id": _to_object_id(payload.noteId, "note id"), "userId": current_user["_id"]})
        if note is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
        source_text = note["extractedText"]
        title = note["fileName"]
    elif not payload.topic:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provide either noteId or topic.")

    try:
        questions = await generate_quiz_questions(
            source_text=source_text,
            topic=payload.topic,
            difficulty=payload.difficulty,
            question_spec=payload.questionSpec.model_dump(),
        )
    except LLMServiceError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"AI service error: {exc}")

    if not questions:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="The AI model didn't return any questions.")

    now = datetime.now(timezone.utc)
    doc = {
        "userId": current_user["_id"],
        "title": title,
        "subject": payload.subject,
        "difficulty": payload.difficulty,
        "noteId": ObjectId(payload.noteId) if payload.noteId else None,
        "questions": questions,
        "isCompleted": False,
        "score": None,
        "percentage": None,
        "createdAt": now,
        "completedAt": None,
    }
    result = await db.quizzes.insert_one(doc)

    return QuizDetail(
        id=str(result.inserted_id),
        title=title,
        subject=payload.subject,
        difficulty=payload.difficulty,
        questions=[QuizQuestionPublic(**q) for q in questions],
        isCompleted=False,
        createdAt=now,
    )


@router.get("/history", response_model=list[QuizSummary])
async def quiz_history(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    cursor = db.quizzes.find({"userId": current_user["_id"]}).sort("createdAt", -1)
    return [_quiz_to_summary(doc) async for doc in cursor]


@router.get("/{quiz_id}", response_model=QuizDetail)
async def get_quiz(
    quiz_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    doc = await _get_owned_quiz(db, quiz_id, current_user["_id"])
    return QuizDetail(
        id=str(doc["_id"]),
        title=doc["title"],
        subject=doc.get("subject"),
        difficulty=doc["difficulty"],
        questions=[QuizQuestionPublic(**q) for q in doc["questions"]],
        isCompleted=doc.get("isCompleted", False),
        createdAt=doc["createdAt"],
    )


@router.post("/{quiz_id}/submit", response_model=QuizResultResponse)
async def submit_quiz(
    quiz_id: str,
    payload: QuizSubmitRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    doc = await _get_owned_quiz(db, quiz_id, current_user["_id"])
    if doc.get("isCompleted"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This quiz has already been submitted.")

    try:
        evaluation = await evaluate_answers(doc["questions"], payload.answers)
    except LLMServiceError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"AI service error: {exc}")

    now = datetime.now(timezone.utc)
    await db.quizzes.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "isCompleted": True,
                "score": evaluation["score"],
                "percentage": evaluation["percentage"],
                "completedAt": now,
                "submittedAnswers": payload.answers,
            }
        },
    )
    await db.quiz_attempts.insert_one(
        {
            "quizId": doc["_id"],
            "userId": current_user["_id"],
            "answers": payload.answers,
            "results": evaluation["results"],
            "score": evaluation["score"],
            "totalQuestions": evaluation["totalQuestions"],
            "percentage": evaluation["percentage"],
            "submittedAt": now,
        }
    )
    await log_activity(
        db,
        current_user["_id"],
        quizzes=1,
        minutes=max(5, evaluation["totalQuestions"] * 1.5),
        subject=doc.get("subject"),
    )

    return QuizResultResponse(
        id=str(doc["_id"]),
        title=doc["title"],
        score=evaluation["score"],
        totalQuestions=evaluation["totalQuestions"],
        percentage=evaluation["percentage"],
        results=[QuestionResult(**r) for r in evaluation["results"]],
        completedAt=now,
    )


@router.get("/{quiz_id}/result", response_model=QuizResultResponse)
async def get_quiz_result(
    quiz_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    doc = await _get_owned_quiz(db, quiz_id, current_user["_id"])
    if not doc.get("isCompleted"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This quiz hasn't been submitted yet.")

    attempt = await db.quiz_attempts.find_one({"quizId": doc["_id"]}, sort=[("submittedAt", -1)])
    if attempt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No attempt found for this quiz.")

    return QuizResultResponse(
        id=str(doc["_id"]),
        title=doc["title"],
        score=attempt["score"],
        totalQuestions=attempt["totalQuestions"],
        percentage=attempt["percentage"],
        results=[QuestionResult(**r) for r in attempt["results"]],
        completedAt=attempt["submittedAt"],
    )


@router.delete("/{quiz_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quiz(
    quiz_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    doc = await _get_owned_quiz(db, quiz_id, current_user["_id"])
    await db.quizzes.delete_one({"_id": doc["_id"]})
    await db.quiz_attempts.delete_many({"quizId": doc["_id"]})
