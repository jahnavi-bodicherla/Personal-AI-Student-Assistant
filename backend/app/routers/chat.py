"""
Chat endpoints: send a message, list/view/delete conversations, regenerate
the last AI response. All routes are protected (require a valid access token).
"""
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.mongodb import get_database
from app.schemas.chat import (
    ChatMessage,
    ChatResponse,
    ConversationDetail,
    ConversationSummary,
    RegenerateRequest,
    SendMessageRequest,
)
from app.services.activity_tracker import log_activity
from app.services.llm import LLMServiceError, derive_title, generate_chat_reply
from app.utils.deps import get_current_user

router = APIRouter(prefix="/api/chat", tags=["Chat"])


def _to_object_id(raw_id: str) -> ObjectId:
    try:
        return ObjectId(raw_id)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid conversation id")


async def _get_owned_conversation(db: AsyncIOMotorDatabase, conversation_id: str, user_id: ObjectId) -> dict:
    doc = await db.chat_conversations.find_one(
        {"_id": _to_object_id(conversation_id), "userId": user_id}
    )
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return doc


def _conversation_to_summary(doc: dict) -> ConversationSummary:
    last_message = doc["messages"][-1]["content"] if doc.get("messages") else None
    return ConversationSummary(
        id=str(doc["_id"]),
        title=doc["title"],
        updatedAt=doc["updatedAt"],
        createdAt=doc["createdAt"],
        lastMessagePreview=(last_message[:80] + "…") if last_message and len(last_message) > 80 else last_message,
    )


def _conversation_to_detail(doc: dict) -> ConversationDetail:
    return ConversationDetail(
        id=str(doc["_id"]),
        title=doc["title"],
        messages=[ChatMessage(**m) for m in doc.get("messages", [])],
        createdAt=doc["createdAt"],
        updatedAt=doc["updatedAt"],
    )


@router.post("", response_model=ChatResponse)
async def send_message(
    payload: SendMessageRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    user_id = current_user["_id"]
    now = datetime.now(timezone.utc)
    user_message = {"role": "user", "content": payload.message, "createdAt": now}

    if payload.conversationId:
        conversation = await _get_owned_conversation(db, payload.conversationId, user_id)
        history = [{"role": m["role"], "content": m["content"]} for m in conversation["messages"]]
    else:
        conversation = None
        history = []

    history.append({"role": "user", "content": payload.message})

    try:
        reply_text = await generate_chat_reply(history)
    except LLMServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI service error: {exc}",
        )

    assistant_message = {"role": "assistant", "content": reply_text, "createdAt": datetime.now(timezone.utc)}

    if conversation is None:
        title = derive_title(payload.message)
        doc = {
            "userId": user_id,
            "title": title,
            "messages": [user_message, assistant_message],
            "createdAt": now,
            "updatedAt": datetime.now(timezone.utc),
        }
        result = await db.chat_conversations.insert_one(doc)
        conversation_id = result.inserted_id
    else:
        conversation_id = conversation["_id"]
        title = conversation["title"]
        await db.chat_conversations.update_one(
            {"_id": conversation_id},
            {
                "$push": {"messages": {"$each": [user_message, assistant_message]}},
                "$set": {"updatedAt": datetime.now(timezone.utc)},
            },
        )

    # Bump the user's questionsAsked counter + daily activity log for the dashboard/analytics.
    await log_activity(db, user_id, questions=1, minutes=2)

    return ChatResponse(
        conversationId=str(conversation_id),
        title=title,
        message=ChatMessage(**assistant_message),
    )


@router.get("/history", response_model=list[ConversationSummary])
async def get_history(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    cursor = db.chat_conversations.find({"userId": current_user["_id"]}).sort("updatedAt", -1)
    return [_conversation_to_summary(doc) async for doc in cursor]


@router.get("/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    doc = await _get_owned_conversation(db, conversation_id, current_user["_id"])
    return _conversation_to_detail(doc)


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    doc = await _get_owned_conversation(db, conversation_id, current_user["_id"])
    await db.chat_conversations.delete_one({"_id": doc["_id"]})


@router.post("/{conversation_id}/regenerate", response_model=ChatResponse)
async def regenerate_response(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    conversation = await _get_owned_conversation(db, conversation_id, current_user["_id"])
    messages = conversation["messages"]

    if not messages or messages[-1]["role"] != "assistant":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The last message isn't an AI response, so there's nothing to regenerate.",
        )

    # Drop the last assistant message; resend everything up to (and including) the last user message.
    history_without_last_reply = messages[:-1]
    history = [{"role": m["role"], "content": m["content"]} for m in history_without_last_reply]

    try:
        reply_text = await generate_chat_reply(history)
    except LLMServiceError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"AI service error: {exc}")

    new_assistant_message = {
        "role": "assistant",
        "content": reply_text,
        "createdAt": datetime.now(timezone.utc),
    }

    await db.chat_conversations.update_one(
        {"_id": conversation["_id"]},
        {
            "$set": {
                "messages": [*history_without_last_reply, new_assistant_message],
                "updatedAt": datetime.now(timezone.utc),
            }
        },
    )

    return ChatResponse(
        conversationId=str(conversation["_id"]),
        title=conversation["title"],
        message=ChatMessage(**new_assistant_message),
    )
