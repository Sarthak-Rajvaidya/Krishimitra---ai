from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings

_s = get_settings()
_kwargs = {"connect_args": {"check_same_thread": False}} if _s.database_url.startswith("sqlite") else {"pool_pre_ping": True}
engine = create_engine(_s.database_url, **_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
