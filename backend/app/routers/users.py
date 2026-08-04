"""
Profile endpoints (protected).
"""
from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.mongodb import get_database
from app.schemas.user import UserProfile, UserProfileUpdate
from app.utils.deps import get_current_user
from app.utils.serializers import user_doc_to_profile

router = APIRouter(prefix="/api/profile", tags=["Profile"])


@router.get("", response_model=UserProfile)
async def get_profile(current_user: dict = Depends(get_current_user)):
    return user_doc_to_profile(current_user)


@router.put("", response_model=UserProfile)
async def update_profile(
    payload: UserProfileUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"_id": current_user["_id"]}, {"$set": updates})
        current_user = await db.users.find_one({"_id": current_user["_id"]})
    return user_doc_to_profile(current_user)
