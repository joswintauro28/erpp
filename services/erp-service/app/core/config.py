from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_file": ".env", "extra": "ignore"}

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:root@localhost:5432/erp_db"

    # JWT
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_SECONDS: int = 900
    REFRESH_TOKEN_EXPIRE_SECONDS: int = 604800

    # Lockout
    MAX_LOGIN_ATTEMPTS: int = 5
    ACCOUNT_LOCKOUT_MINUTES: int = 15

    # Rate limiting
    RATE_LIMIT_ENABLED: bool = True
    LOGIN_RATE_LIMIT: str = "5/minute"
    REGISTER_RATE_LIMIT: str = "3/hour"
    API_RATE_LIMIT: str = "100/minute"

    # RustFS Object Storage (S3-compatible)
    RUSTFS_ENDPOINT: str = "localhost:9000"
    RUSTFS_ACCESS_KEY: str = "datavex-rustfs-admin"
    RUSTFS_SECRET_KEY: str = "datavex-rustfs-admin"
    RUSTFS_SECURE: bool = False
    # Public URL for presigned URLs — browsers use this to reach RustFS.
    # In Docker: http://rustfs.erp.local:80  (proxied through nginx)
    # In local dev: http://localhost:9000
    RUSTFS_PUBLIC_URL: str = "http://localhost:9000"

    # File upload limits
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_MIME_TYPES: str = (
        "image/*,application/pdf,text/csv,"
        "application/vnd.ms-excel,"
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,"
        "application/msword,"
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )

    # App
    PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:3000"
    CORS_ORIGINS: str = (
        "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3004"
    )
    ENV: str = "development"


settings = Settings()
