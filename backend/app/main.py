"""
AI Personal Study Assistant - FastAPI entrypoint.

Run with an ASGI server (uvicorn intentionally avoided - use Hypercorn instead):
    hypercorn app.main:app --reload --bind 0.0.0.0:8000
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database.mongodb import mongo
from app.routers import auth, chat, notes, progress, quiz, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    await mongo.connect()
    yield
    await mongo.close()


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(chat.router)
app.include_router(notes.router)
app.include_router(quiz.router)
app.include_router(progress.router)


@app.get("/api/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "app": settings.APP_NAME}
