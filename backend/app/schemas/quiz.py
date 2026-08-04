from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

QuestionType = Literal["mcq", "true_false", "fill_blank", "coding"]
Difficulty = Literal["easy", "medium", "hard"]


class QuestionSpec(BaseModel):
    mcq: int = 0
    true_false: int = 0
    fill_blank: int = 0
    coding: int = 0

    def total(self) -> int:
        return self.mcq + self.true_false + self.fill_blank + self.coding


class QuizGenerateRequest(BaseModel):
    noteId: Optional[str] = None
    topic: Optional[str] = None
    subject: Optional[str] = None
    difficulty: Difficulty = "medium"
    questionSpec: QuestionSpec


class QuizQuestionPublic(BaseModel):
    """Sanitized question shown to the student while taking the quiz (no answer key)."""
    id: str
    type: QuestionType
    question: str
    options: list[str] = []


class QuizSummary(BaseModel):
    id: str
    title: str
    subject: Optional[str] = None
    difficulty: Difficulty
    totalQuestions: int
    isCompleted: bool
    score: Optional[int] = None
    percentage: Optional[float] = None
    createdAt: datetime
    completedAt: Optional[datetime] = None


class QuizDetail(BaseModel):
    id: str
    title: str
    subject: Optional[str] = None
    difficulty: Difficulty
    questions: list[QuizQuestionPublic]
    isCompleted: bool
    createdAt: datetime


class QuizSubmitRequest(BaseModel):
    answers: dict[str, str] = Field(default_factory=dict)


class QuestionResult(BaseModel):
    questionId: str
    question: str
    type: QuestionType
    userAnswer: str
    correctAnswer: str
    isCorrect: bool
    explanation: str


class QuizResultResponse(BaseModel):
    id: str
    title: str
    score: int
    totalQuestions: int
    percentage: float
    results: list[QuestionResult]
    completedAt: datetime
