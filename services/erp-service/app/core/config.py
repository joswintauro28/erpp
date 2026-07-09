from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_file": ".env", "extra": "ignore"}

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:root@localhost:5432/erp_db"

    # JWT
    JWT_SECRET: str = "development-jwt-secret-key-123"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_SECONDS: int = 900
    REFRESH_TOKEN_EXPIRE_SECONDS: int = 604800

    # Lockout
    MAX_LOGIN_ATTEMPTS: int = 5
    ACCOUNT_LOCKOUT_MINUTES: int = 15

    # Rate limiting
    RATE_LIMIT_ENABLED: bool = False
    LOGIN_RATE_LIMIT: str = "5/minute"
    REGISTER_RATE_LIMIT: str = "3/hour"
    API_RATE_LIMIT: str = "100/minute"

    # App
    PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:3000"
    ENV: str = "development"


settings = Settings()
