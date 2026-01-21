from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session, declarative_base
from typing import Generator
from app.config.settings import settings

engine = create_engine(
    str(settings.DATABASE_URL),
    pool_pre_ping=True,
)



SessionLocal = scoped_session(
    sessionmaker(autocommit=False, autoflush=False, bind=engine)
)

Base = declarative_base()

def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



def init_db():
    """
    Development helper: create all tables from models.
    In production, prefer Alembic migrations instead of this function.
    """
    import app.database.models as models  # import models to register them on Base
    Base.metadata.create_all(bind=engine)
