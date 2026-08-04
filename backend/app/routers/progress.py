"""
Learning Analytics endpoints: overview stats, weekly/monthly activity for
charts, and per-subject quiz performance.
"""
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.mongodb import get_database
from app.schemas.progress import DailyActivity, ProgressOverview, ProgressResponse, SubjectBreakdown
from app.utils.deps import get_current_user

router = APIRouter(prefix="/api/progress", tags=["Progress"])


async def _activity_series(db: AsyncIOMotorDatabase, user_id, num_days: int) -> list[DailyActivity]:
    start_date = date.today() - timedelta(days=num_days - 1)
    docs = await db.activity_log.find(
        {"userId": user_id, "date": {"$gte": start_date.isoformat()}}
    ).to_list(length=num_days)
    by_date = {d["date"]: d for d in docs}

    series = []
    for i in range(num_days):
        day = start_date + timedelta(days=i)
        entry = by_date.get(day.isoformat())
        series.append(
            DailyActivity(
                date=day,
                questionsAsked=entry["questionsAsked"] if entry else 0,
                quizzesCompleted=entry["quizzesCompleted"] if entry else 0,
                studyMinutes=round(entry["studyMinutes"], 1) if entry else 0.0,
            )
        )
    return series


@router.get("", response_model=ProgressResponse)
async def get_progress(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    user_id = current_user["_id"]

    progress_doc = await db.study_progress.find_one({"userId": user_id}) or {}
    notes_count = await db.notes.count_documents({"userId": user_id})

    # Average score computed live from completed quizzes (more reliable than a running counter).
    score_cursor = db.quizzes.aggregate(
        [
            {"$match": {"userId": user_id, "isCompleted": True}},
            {"$group": {"_id": None, "avgPercentage": {"$avg": "$percentage"}, "count": {"$sum": 1}}},
        ]
    )
    score_result = await score_cursor.to_list(length=1)
    average_score = round(score_result[0]["avgPercentage"], 1) if score_result else 0.0
    quizzes_completed = score_result[0]["count"] if score_result else 0

    overview = ProgressOverview(
        questionsAsked=progress_doc.get("questionsAsked", 0),
        studyHours=round(progress_doc.get("studyHours", 0), 1),
        quizzesCompleted=quizzes_completed,
        averageScore=average_score,
        learningStreak=progress_doc.get("learningStreak", 0),
        notesUploaded=notes_count,
    )

    weekly = await _activity_series(db, user_id, 7)
    monthly = await _activity_series(db, user_id, 30)

    subject_cursor = db.quizzes.aggregate(
        [
            {"$match": {"userId": user_id, "isCompleted": True}},
            {
                "$group": {
                    "_id": {"$ifNull": ["$subject", "General"]},
                    "quizzesCompleted": {"$sum": 1},
                    "averageScore": {"$avg": "$percentage"},
                }
            },
            {"$sort": {"quizzesCompleted": -1}},
        ]
    )
    subjects = [
        SubjectBreakdown(
            subject=doc["_id"],
            quizzesCompleted=doc["quizzesCompleted"],
            averageScore=round(doc["averageScore"], 1),
        )
        async for doc in subject_cursor
    ]

    return ProgressResponse(overview=overview, weekly=weekly, monthly=monthly, subjects=subjects)
