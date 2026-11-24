from pydantic import PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    # ---------------- DATABASE ----------------
    POSTGRES_DSN: PostgresDsn

    # ---------------- JWT ----------------
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ---------------- APP ----------------
    ENVIRONMENT: str = "development"
    APP_DOMAIN: str = "http://localhost:8000"
    # Comma-separated list of allowed browser origins, or "*" for any.
    CORS_ORIGINS: str = "*"

    # ---------------- SOCIAL LOGIN ----------------
    GOOGLE_CLIENT_ID: str | None = None

    # ---------------- EMAIL ----------------
    SMTP_SERVER: str
    SMTP_PORT: int
    SMTP_EMAIL: str
    SMTP_PASSWORD: str

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    @property
    def DATABASE_URL(self) -> PostgresDsn:
        return self.POSTGRES_DSN

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    def public_profile_url(self, slug: str) -> str:
        return f"{self.APP_DOMAIN.rstrip('/')}/public/view/{slug}"


settings = Settings()
