import os
from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET: str
    JWT_EXPIRES_IN: str = "7d"
    PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:3000"
    AI_SERVICE_URL: str = "http://localhost:8000"
    NODE_ENV: str = "development"
    ENCRYPTION_KEY: str

    class Config:
        env_file = str(Path(__file__).resolve().parents[1] / ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
