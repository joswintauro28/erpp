from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_file": ".env", "extra": "ignore"}

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:root@localhost:5432/erp_ai"

    # JWT (must match core-iam and all other services)
    JWT_SECRET: str = "development-jwt-secret-key-123"
    JWT_ALGORITHM: str = "HS256"

    # LLM Provider
    AI_PROVIDER: str = "groq"  # "groq" or "gemini"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.1-8b-instant"
    GEMINI_API_KEY: str = ""

    # Inter-service URLs
    CRM_SERVICE_URL: str = "http://localhost:8001"
    BILLING_SERVICE_URL: str = "http://localhost:8003"
    INVENTORY_SERVICE_URL: str = "http://localhost:8004"

    # App
    PORT: int = 8005
    ENV: str = "development"
    CORS_ORIGINS: str = (
        "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3004"
    )

    # Rate limiting
    AI_RATE_LIMIT: str = "30/minute"
    MAX_INPUT_LENGTH: int = 4000


settings = Settings()
