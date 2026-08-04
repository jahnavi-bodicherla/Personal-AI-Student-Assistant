"""
Authentication endpoints: register, login, refresh, logout, /me.
"""
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from app.database.mongodb import get_database
from app.schemas.user import (
    AuthResponse,
    RefreshRequest,
    TokenPair,
    UserLogin,
    UserProfile,
    UserRegister,
)
from app.utils.deps import get_current_user
from app.utils.security import (
    InvalidTokenError,
    create_access_token,
    create_refresh_token,
    decode_token_payload,
    hash_password,
    verify_password,
)
from app.utils.serializers import user_doc_to_profile

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
bearer_scheme = HTTPBearer(auto_error=True)


def _issue_tokens(user_id: str) -> TokenPair:
    return TokenPair(
        access_token=create_access_token(user_id),
        refresh_token=create_refresh_token(user_id),
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister, db: AsyncIOMotorDatabase = Depends(get_database)):
    existing = await db.users.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user_doc = {
        "name": payload.name,
        "email": payload.email,
        "password": hash_password(payload.password),
        "college": payload.college,
        "department": payload.department,
        "semester": payload.semester,
        "profileImage": None,
        "preferredSubjects": [],
        "learningGoals": [],
        "createdAt": datetime.now(timezone.utc),
    }

    try:
        result = await db.users.insert_one(user_doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user_doc["_id"] = result.inserted_id

    # Seed an initial study-progress record for the new user
    await db.study_progress.insert_one(
        {
            "userId": result.inserted_id,
            "studyHours": 0,
            "questionsAsked": 0,
            "quizzesCompleted": 0,
            "averageScore": 0,
            "learningStreak": 0,
            "lastStudyDate": None,
        }
    )

    tokens = _issue_tokens(str(result.inserted_id))
    return AuthResponse(user=user_doc_to_profile(user_doc), tokens=tokens)


@router.post("/login", response_model=AuthResponse)
async def login(payload: UserLogin, db: AsyncIOMotorDatabase = Depends(get_database)):
    user = await db.users.find_one({"email": payload.email})
    if not user or not verify_password(payload.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    tokens = _issue_tokens(str(user["_id"]))
    return AuthResponse(user=user_doc_to_profile(user), tokens=tokens)


@router.post("/refresh", response_model=TokenPair)
async def refresh(payload: RefreshRequest, db: AsyncIOMotorDatabase = Depends(get_database)):
    try:
        token_payload = decode_token_payload(payload.refresh_token, expected_type="refresh")
    except InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    jti = token_payload.get("jti")
    if jti and await db.revoked_tokens.find_one({"jti": jti}):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has been revoked")

    user_id = token_payload["sub"]
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User no longer exists")

    # Rotate: revoke the used refresh token, issue a brand-new pair
    await db.revoked_tokens.insert_one({"jti": jti, "revokedAt": datetime.now(timezone.utc)})
    return _issue_tokens(user_id)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Revokes the current access token (and, if provided, is idempotent if already revoked)."""
    try:
        payload = decode_token_payload(credentials.credentials, expected_type="access")
    except InvalidTokenError:
        # Already invalid/expired -> nothing to revoke, logout is still a success from the client's POV
        return
    jti = payload.get("jti")
    if jti:
        await db.revoked_tokens.insert_one({"jti": jti, "revokedAt": datetime.now(timezone.utc)})


@router.get("/me", response_model=UserProfile)
async def get_me(current_user: dict = Depends(get_current_user)):
    return user_doc_to_profile(current_user)
