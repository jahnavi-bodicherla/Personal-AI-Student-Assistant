"""
Shared FastAPI dependencies: current user resolution from JWT bearer token.
"""
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.mongodb import get_database
from app.utils.security import InvalidTokenError, decode_token_payload

bearer_scheme = HTTPBearer(auto_error=True)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token_payload(token, expected_type="access")
    except InvalidTokenError:
        raise credentials_exception

    jti = payload.get("jti")
    if jti and await db.revoked_tokens.find_one({"jti": jti}):
        raise credentials_exception

    try:
        user_id = ObjectId(payload["sub"])
    except InvalidId:
        raise credentials_exception

    user = await db.users.find_one({"_id": user_id})
    if user is None:
        raise credentials_exception

    return user
