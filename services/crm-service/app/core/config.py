import os

class Settings:
    JWT_SECRET: str = os.environ.get("JWT_SECRET", "development-jwt-secret-key-123")

settings = Settings()
