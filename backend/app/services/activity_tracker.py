"""
Central place that records "something study-related happened" so the
dashboard/progress/analytics endpoints have real data to aggregate.

Call log_activity(...) from any router where the user does study work: asking
a chat question, uploading/asking about notes, completing a quiz, etc.
"""
from datetime import date, datetime, timedelta, timezone

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase


async def log_activity(
    db: AsyncIOMotorDatabase,
    user_id: ObjectId,
    *,
    questions: int = 0,
    quizzes: int = 0,
    minutes: float = 0.0,
    subject: str | None = None,
) -> None:
    today = date.today().isoformat()

    # 1) Upsert today's per-day activity log entry (powers weekly/monthly charts).
    await db.activity_log.update_one(
        {"userId": user_id, "date": today},
        {
            "$inc": {
                "questionsAsked": questions,
                "quizzesCompleted": quizzes,
                "studyMinutes": minutes,
            },
            "$setOnInsert": {"userId": user_id, "date": today},
        },
        upsert=True,
    )

    if subject and quizzes:
        await db.subject_activity.update_one(
            {"userId": user_id, "subject": subject},
            {"$inc": {"quizzesCompleted": quizzes}},
            upsert=True,
        )

    # 2) Update the running study_progress aggregate + learning streak.
    progress = await db.study_progress.find_one({"userId": user_id})
    last_study_date = progress.get("lastStudyDate") if progress else None

    if last_study_date == today:
        streak_update = {}
    elif last_study_date == (date.today() - timedelta(days=1)).isoformat():
        streak_update = {"$inc": {"learningStreak": 1}}
    else:
        streak_update = {"$set": {"learningStreak": 1}}

    update_doc = {
        "$inc": {
            "questionsAsked": questions,
            "quizzesCompleted": quizzes,
            "studyHours": round(minutes / 60, 4),
        },
        "$set": {"lastStudyDate": today},
    }
    for op, fields in streak_update.items():
        update_doc.setdefault(op, {}).update(fields)

    await db.study_progress.update_one({"userId": user_id}, update_doc, upsert=True)
