"""
Database setup — SQLite via SQLAlchemy.
Switch to PostgreSQL/Supabase by changing DATABASE_URL in .env:
  DATABASE_URL=postgresql+psycopg2://user:pass@host/dbname
"""
import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv()


BACKEND_DIR = Path(__file__).resolve().parent
DEFAULT_DB = (BACKEND_DIR / "medilens.db").as_posix()
DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB}")

# SQLite needs check_same_thread=False; ignored by other drivers
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}


engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
