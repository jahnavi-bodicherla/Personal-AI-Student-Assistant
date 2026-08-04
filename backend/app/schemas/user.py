"""
Pydantic request/response models for authentication & user profile.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    college: Optional[str] = None
    department: Optional[str] = None
    semester: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        if not any(c.isalpha() for c in v):
            raise ValueError("Password must contain at least one letter")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserProfile(BaseModel):
    id: str
    name: str
    email: EmailStr
    college: Optional[str] = None
    department: Optional[str] = None
    semester: Optional[str] = None
    profileImage: Optional[str] = None
    preferredSubjects: list[str] = []
    learningGoals: list[str] = []
    createdAt: datetime


class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    college: Optional[str] = None
    department: Optional[str] = None
    semester: Optional[str] = None
    preferredSubjects: Optional[list[str]] = None
    learningGoals: Optional[list[str]] = None


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class AuthResponse(BaseModel):
    user: UserProfile
    tokens: TokenPair
