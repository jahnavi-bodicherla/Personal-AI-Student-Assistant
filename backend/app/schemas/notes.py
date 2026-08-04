from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class NoteSummaryListItem(BaseModel):
    id: str
    fileName: str
    fileType: str
    subject: Optional[str] = None
    textLength: int
    uploadDate: datetime
    hasSummary: bool
    # Defaults to False so notes uploaded before this feature still validate.
    isHandwritten: bool = False


class NoteDetail(BaseModel):
    id: str
    fileName: str
    fileType: str
    subject: Optional[str] = None
    extractedText: str
    uploadDate: datetime
    isHandwritten: bool = False


class NoteAskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)


class NoteAskResponse(BaseModel):
    noteId: str
    question: str
    answer: str
    createdAt: datetime


class DefinitionItem(BaseModel):
    term: str
    definition: str


class NoteSummaryResponse(BaseModel):
    noteId: str
    shortSummary: str
    detailedSummary: str
    examRevisionNotes: str
    keyPoints: list[str]
    definitions: list[DefinitionItem]
    formulaSheet: list[str]
    mindMap: str
    createdAt: datetime
