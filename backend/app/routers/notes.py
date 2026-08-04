"""
Upload Notes + AI Note Summarizer endpoints.

Students upload PDF/DOCX/TXT study material; text is extracted and stored so
they can ask questions scoped to that note and generate a structured summary.
"""
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.mongodb import get_database
from app.schemas.notes import (
    NoteAskRequest,
    NoteAskResponse,
    NoteDetail,
    NoteSummaryListItem,
    NoteSummaryResponse,
)
from app.services.activity_tracker import log_activity
from app.services.file_extraction import (
    SUPPORTED_EXTENSIONS,
    TextExtractionError,
    UnsupportedFileTypeError,
    extract_text,
)
from app.services.handwriting import (
    IMAGE_EXTENSIONS,
    MAX_IMAGE_BYTES,
    is_image,
    transcribe_handwriting,
)
from app.services.llm import LLMServiceError, answer_from_context
from app.services.summarizer import generate_note_summary
from app.utils.deps import get_current_user

router = APIRouter(prefix="/api/notes", tags=["Notes"])

MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 MB


def _to_object_id(raw_id: str) -> ObjectId:
    try:
        return ObjectId(raw_id)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid note id")


async def _get_owned_note(db: AsyncIOMotorDatabase, note_id: str, user_id: ObjectId) -> dict:
    doc = await db.notes.find_one({"_id": _to_object_id(note_id), "userId": user_id})
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return doc


@router.post("/upload", response_model=NoteSummaryListItem, status_code=status.HTTP_201_CREATED)
async def upload_note(
    file: UploadFile = File(...),
    subject: str | None = Form(default=None),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    filename = file.filename or "upload"
    lower_name = filename.lower()
    allowed_extensions = SUPPORTED_EXTENSIONS | IMAGE_EXTENSIONS
    if not any(lower_name.endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type. Supported: {', '.join(sorted(allowed_extensions))}",
        )

    handwritten = is_image(filename)
    # Photos of a page are bigger than documents, so they get their own ceiling.
    size_limit = MAX_IMAGE_BYTES if handwritten else MAX_UPLOAD_BYTES

    file_bytes = await file.read()
    if len(file_bytes) > size_limit:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File is too large (max {size_limit // (1024 * 1024)} MB).",
        )

    if handwritten:
        # No text layer exists in a photo, so the vision model reads it instead.
        try:
            extracted_text = await transcribe_handwriting(filename, file_bytes)
        except LLMServiceError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"AI service error: {exc}",
            )
    else:
        try:
            extracted_text = extract_text(filename, file_bytes)
        except UnsupportedFileTypeError as exc:
            raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail=str(exc))
        except TextExtractionError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    file_type = filename.rsplit(".", 1)[-1].lower()
    now = datetime.now(timezone.utc)
    doc = {
        "userId": current_user["_id"],
        "fileName": filename,
        "fileType": file_type,
        "subject": subject,
        "extractedText": extracted_text,
        "textLength": len(extracted_text),
        "isHandwritten": handwritten,
        "uploadDate": now,
    }
    result = await db.notes.insert_one(doc)

    if handwritten:
        # Transcription is a real AI call, so it counts toward study activity.
        await log_activity(db, current_user["_id"], minutes=3)

    return NoteSummaryListItem(
        id=str(result.inserted_id),
        fileName=filename,
        fileType=file_type,
        subject=subject,
        textLength=len(extracted_text),
        uploadDate=now,
        hasSummary=False,
        isHandwritten=handwritten,
    )


@router.get("", response_model=list[NoteSummaryListItem])
async def list_notes(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    cursor = db.notes.find({"userId": current_user["_id"]}).sort("uploadDate", -1)
    items = []
    async for doc in cursor:
        summary_exists = await db.note_summaries.find_one({"noteId": doc["_id"]}, {"_id": 1})
        items.append(
            NoteSummaryListItem(
                id=str(doc["_id"]),
                fileName=doc["fileName"],
                fileType=doc["fileType"],
                subject=doc.get("subject"),
                textLength=doc["textLength"],
                uploadDate=doc["uploadDate"],
                hasSummary=summary_exists is not None,
                # Older notes predate this field, so default rather than KeyError.
                isHandwritten=doc.get("isHandwritten", False),
            )
        )
    return items


@router.get("/{note_id}", response_model=NoteDetail)
async def get_note(
    note_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    doc = await _get_owned_note(db, note_id, current_user["_id"])
    return NoteDetail(
        id=str(doc["_id"]),
        fileName=doc["fileName"],
        fileType=doc["fileType"],
        subject=doc.get("subject"),
        extractedText=doc["extractedText"],
        uploadDate=doc["uploadDate"],
        isHandwritten=doc.get("isHandwritten", False),
    )


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    doc = await _get_owned_note(db, note_id, current_user["_id"])
    await db.notes.delete_one({"_id": doc["_id"]})
    await db.note_summaries.delete_many({"noteId": doc["_id"]})


@router.post("/{note_id}/ask", response_model=NoteAskResponse)
async def ask_note(
    note_id: str,
    payload: NoteAskRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    doc = await _get_owned_note(db, note_id, current_user["_id"])

    try:
        answer = await answer_from_context(doc["extractedText"], payload.question)
    except LLMServiceError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"AI service error: {exc}")

    now = datetime.now(timezone.utc)
    await db.note_questions.insert_one(
        {
            "noteId": doc["_id"],
            "userId": current_user["_id"],
            "question": payload.question,
            "answer": answer,
            "createdAt": now,
        }
    )
    await log_activity(db, current_user["_id"], questions=1, minutes=2)

    return NoteAskResponse(noteId=note_id, question=payload.question, answer=answer, createdAt=now)


@router.post("/{note_id}/summary", response_model=NoteSummaryResponse)
async def create_or_regenerate_summary(
    note_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    doc = await _get_owned_note(db, note_id, current_user["_id"])

    try:
        summary = await generate_note_summary(doc["extractedText"])
    except LLMServiceError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"AI service error: {exc}")

    now = datetime.now(timezone.utc)
    summary_doc = {
        "noteId": doc["_id"],
        "userId": current_user["_id"],
        **summary,
        "createdAt": now,
    }
    await db.note_summaries.update_one(
        {"noteId": doc["_id"]}, {"$set": summary_doc}, upsert=True
    )
    await log_activity(db, current_user["_id"], minutes=3)

    return NoteSummaryResponse(noteId=note_id, createdAt=now, **summary)


@router.get("/{note_id}/summary", response_model=NoteSummaryResponse)
async def get_summary(
    note_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    doc = await _get_owned_note(db, note_id, current_user["_id"])
    summary_doc = await db.note_summaries.find_one({"noteId": doc["_id"]})
    if summary_doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No summary yet for this note. Generate one first with POST /summary.",
        )
    return NoteSummaryResponse(
        noteId=note_id,
        shortSummary=summary_doc["shortSummary"],
        detailedSummary=summary_doc["detailedSummary"],
        examRevisionNotes=summary_doc["examRevisionNotes"],
        keyPoints=summary_doc["keyPoints"],
        definitions=summary_doc["definitions"],
        formulaSheet=summary_doc["formulaSheet"],
        mindMap=summary_doc["mindMap"],
        createdAt=summary_doc["createdAt"],
    )
