"""
Async MongoDB connection manager (Motor driver).
Connection is opened on app startup and closed on shutdown (see main.py lifespan).
"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings


class MongoManager:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None

    async def connect(self) -> None:
        self.client = AsyncIOMotorClient(settings.MONGO_URI)
        self.db = self.client[settings.MONGO_DB_NAME]
        # Ensure indexes that matter for auth
        await self.db.users.create_index("email", unique=True)

    async def close(self) -> None:
        if self.client:
            self.client.close()

    def get_db(self) -> AsyncIOMotorDatabase:
        if self.db is None:
            raise RuntimeError("Database not initialized. Did the app startup run?")
        return self.db


mongo = MongoManager()


def get_database() -> AsyncIOMotorDatabase:
    """FastAPI dependency to access the database in routers."""
    return mongo.get_db()
