"""
Pydantic request/response models for the chat module.
"""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    createdAt: datetime


class SendMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=8000)
    conversationId: Optional[str] = None  # omit to start a new conversation


class RegenerateRequest(BaseModel):
    conversationId: str


class ConversationSummary(BaseModel):
    id: str
    title: str
    updatedAt: datetime
    createdAt: datetime
    lastMessagePreview: Optional[str] = None


class ConversationDetail(BaseModel):
    id: str
    title: str
    messages: list[ChatMessage]
    createdAt: datetime
    updatedAt: datetime


class ChatResponse(BaseModel):
    conversationId: str
    title: str
    message: ChatMessage
