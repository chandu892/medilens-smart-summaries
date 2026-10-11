"""
MediLens FastAPI backend (reloaded)
Run: uvicorn main:app --reload --port 8000
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env before anything else
load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import Base, engine
from routers import auth, reports, summaries, assistant, qr, audit

# ---------------------------------------------------------------------------
# Create all DB tables on startup
# ---------------------------------------------------------------------------
Base.metadata.create_all(bind=engine)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="MediLens API",
    description=(
        "AI-powered medical record summarization backend. "
        "Upload medical documents, extract structured data, generate AI summaries."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS — allow Vite dev servers (8082, 5173, 8080, 3000, etc.)
# ---------------------------------------------------------------------------
ALLOWED_ORIGINS = [
    "http://localhost:8082",
    "http://localhost:5173",
    "http://localhost:8080",
    "http://localhost:3000",
    "http://localhost:4173",
    "http://127.0.0.1:8082",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:4173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers — all endpoints under /api
# ---------------------------------------------------------------------------
API_PREFIX = "/api"

app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(reports.router, prefix=API_PREFIX)
app.include_router(summaries.router, prefix=API_PREFIX)
app.include_router(assistant.router, prefix=API_PREFIX)
app.include_router(qr.router, prefix=API_PREFIX)
app.include_router(audit.router, prefix=API_PREFIX)

# ---------------------------------------------------------------------------
# Serve uploaded files (for local dev; use a CDN / object storage in prod)
# ---------------------------------------------------------------------------
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok", "service": "MediLens API"}


# ---------------------------------------------------------------------------
# Startup: seed demo data if DB is empty
# ---------------------------------------------------------------------------
@app.on_event("startup")
def seed_on_startup():
    try:
        from seed_data import seed_demo_data
        from database import SessionLocal
        db = SessionLocal()
        try:
            seed_demo_data(db)
        finally:
            db.close()
    except Exception as exc:
        print(f"[MediLens] Seed warning: {exc}")
