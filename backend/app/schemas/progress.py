from datetime import date as date_type
from typing import Optional

from pydantic import BaseModel


class ProgressOverview(BaseModel):
    questionsAsked: int
    studyHours: float
    quizzesCompleted: int
    averageScore: float
    learningStreak: int
    notesUploaded: int


class DailyActivity(BaseModel):
    date: date_type
    questionsAsked: int
    quizzesCompleted: int
    studyMinutes: float


class SubjectBreakdown(BaseModel):
    subject: str
    quizzesCompleted: int
    averageScore: float


class ProgressResponse(BaseModel):
    overview: ProgressOverview
    weekly: list[DailyActivity]
    monthly: list[DailyActivity]
    subjects: list[SubjectBreakdown]
