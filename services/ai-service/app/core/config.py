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
    AI_RATE_LIMIT: int = 30  # requests per minute per user
    AI_RATE_WINDOW: int = 60  # window in seconds

    # Input limits
    MAX_INPUT_LENGTH: int = 4000

    # Conversation memory
    CONTEXT_WINDOW_MESSAGES: int = 20  # max messages to load for LLM context
    CONTEXT_TOKEN_BUDGET: int = 6000  # approximate token budget for conversation history
    SUMMARIZE_OLDER_THAN: int = 15  # summarize messages older than this count

    # Module permissions — maps module to required permission codes
    MODULE_PERMISSIONS: dict = {
        "admin": [],  # no extra permission needed for admin view
        "crm": ["crm:read"],
        "billing": ["billing:read"],
        "inventory": ["inventory:read"],
    }


settings = Settings()
