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
    # console = log only (dev) · resend = Resend HTTPS API · smtp = SMTP server
    EMAIL_PROVIDER: str = "console"
    EMAIL_FROM: str = "SmartCard <onboarding@resend.dev>"
    RESEND_API_KEY: str | None = None
    SMTP_SERVER: str | None = None
    SMTP_PORT: int = 587
    SMTP_EMAIL: str | None = None
    SMTP_PASSWORD: str | None = None

    # ---------------- WALLET PASSES (optional) ----------------
    # Apple: Pass Type ID certificate + key (PEM) and Apple WWDR G4 cert (PEM)
    APPLE_PASS_TYPE_ID: str | None = None
    APPLE_TEAM_ID: str | None = None
    APPLE_PASS_CERT_PATH: str | None = None
    APPLE_PASS_KEY_PATH: str | None = None
    APPLE_PASS_KEY_PASSWORD: str | None = None
    APPLE_WWDR_CERT_PATH: str | None = None
    # Google: Wallet issuer ID + service account JSON key file
    GOOGLE_WALLET_ISSUER_ID: str | None = None
    GOOGLE_WALLET_SA_KEY_PATH: str | None = None

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
