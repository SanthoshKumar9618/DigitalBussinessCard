# from pydantic_settings import BaseSettings, SettingsConfigDict
# from pydantic import AnyUrl, AnyHttpUrl, field_validator
# from typing import List, Optional
# from datetime import timedelta
#
# import os
# print("RAW DATABASE_URL =", os.getenv("DATABASE_URL"))


# class Settings(BaseSettings):

#     PROJECT_NAME: str = "Digital Business Card API"
#     ENVIRONMENT: str = "development"

#     DATABASE_URL: AnyUrl

    
#     smtp_email: str
#     smtp_password: str
#     smtp_server: str = "smtp.gmail.com"
#     smtp_port: int = 587

#     JWT_SECRET: str
#     JWT_ALGORITHM: str = "HS256"
#     JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
#     JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30
#     BCRYPT_ROUNDS: int = 12

#     USE_S3: bool = False
#     S3_BUCKET_NAME: Optional[str] = None
#     S3_REGION: Optional[str] = None
#     S3_ACCESS_KEY_ID: Optional[str] = None
#     S3_SECRET_ACCESS_KEY: Optional[str] = None
#     S3_ENDPOINT_URL: Optional[str] = None

#     REDIS_URL: Optional[str] = None
#     SENTRY_DSN: Optional[str] = None
#     APP_DOMAIN: str = "https://yourapp.com"
    
#     model_config = SettingsConfigDict(
#         env_file=".env",
#         env_file_encoding="utf-8",
#         extra="ignore",   # <<< ADD THIS LINE
#     )


#     @property
#     def jwt_access_expire(self) -> timedelta:
#         return timedelta(minutes=self.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

#     @property
#     def jwt_refresh_expire(self) -> timedelta:
#         return timedelta(days=self.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    
#     

# settings = Settings()


from pydantic import PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    postgres_dsn: PostgresDsn
    
    POSTGRES_DSN: str
     # ---------------- JWT ----------------
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ---------------- APP ----------------
    ENVIRONMENT: str = "development"
    APP_DOMAIN: str = "http://localhost:8000"

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
        return self.postgres_dsn


settings = Settings()

