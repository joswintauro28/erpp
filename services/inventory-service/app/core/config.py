from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_file": ".env", "extra": "ignore"}

    DATABASE_URL: str = "postgresql+asyncpg://postgres:root@localhost:5432/erp_inventory"
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    PORT: int = 8004
    FRONTEND_URL: str = "http://localhost:3000"
    BILLING_SERVICE_URL: str = "http://localhost:8003"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3002,http://localhost:3004"
    ENV: str = "development"


settings = Settings()
