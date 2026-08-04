"""
Centralized application configuration.
All secrets/config come from environment variables (.env file in dev).
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- App ---
    APP_NAME: str = "AI Personal Study Assistant"
    ENV: str = "development"
    DEBUG: bool = True

    # --- MongoDB ---
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "study_assistant"

    # --- JWT Auth ---
    JWT_SECRET_KEY: str = "kJGJZk5imQQ9mHfxY19k6ZPadxPHpJJS0DF4bnwgZfQ"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24          # 1 day
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7     # 7 days

    # --- CORS ---
    CORS_ORIGINS: list[str] = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://personal-ai-student-assistant.vercel.app"
]

    # --- OpenAI ---
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_MODEL: str = "mistral:latest"

    # Handwritten notes are read by a vision model. This is separate from
    # OPENAI_MODEL because a text-only chat model cannot accept images at all.
    # Ollama users: try "llama3.2-vision" or "llava".
    OPENAI_VISION_MODEL: str = "gpt-4o-mini"

    # --- Environment Config ---
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

print("JWT_SECRET_KEY =", settings.JWT_SECRET_KEY)
print("JWT_ALGORITHM =", settings.JWT_ALGORITHM)
print("OPENAI_MODEL =", settings.OPENAI_MODEL)
print("OPENAI_BASE_URL =", settings.OPENAI_BASE_URL)