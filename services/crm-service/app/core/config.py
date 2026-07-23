import os

class Settings:
    JWT_SECRET: str = os.environ.get("JWT_SECRET", "development-jwt-secret-key-123")
    BILLING_SERVICE_URL: str = os.environ.get("BILLING_SERVICE_URL", "http://localhost:8003")

settings = Settings()
