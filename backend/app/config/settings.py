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
    # Plan for users without one. Billing isn't live, so everyone gets "team"
    # (all features). Set to "free" once paid plans can be bought.
    DEFAULT_PLAN: str = "team"
    # Key for encrypting CRM tokens at rest (Fernet, urlsafe base64, 32 bytes).
    # If empty, a key is derived from JWT_SECRET.
    INTEGRATIONS_ENCRYPTION_KEY: str | None = None

    # Brute-force protection on login / OTP / password reset
    RATE_LIMITS_ENABLED: bool = True

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

    # ---------------- AI (optional; Claude API) ----------------
    # Paper-card scanning and follow-up drafts. Off until a key is set.
    ANTHROPIC_API_KEY: str | None = None
    AI_MODEL: str = "claude-opus-5-5"
    AI_SCANS_PER_DAY: int = 30
    AI_DRAFTS_PER_DAY: int = 60

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
