import os

class Settings:
    JWT_SECRET: str = os.environ["JWT_SECRET"]
    BILLING_SERVICE_URL: str = os.environ.get("BILLING_SERVICE_URL", "http://localhost:8003")
    INVENTORY_SERVICE_URL: str = os.environ.get("INVENTORY_SERVICE_URL", "http://localhost:8004")

settings = Settings()
