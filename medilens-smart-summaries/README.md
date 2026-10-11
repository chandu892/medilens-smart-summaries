# MediLens — Smarter Medical Summaries and Faster Decisions

> AI-powered healthcare application for medical record management and interpretation.
> Upload medical documents, extract structured data with OCR + AI, generate summaries,
> and make faster clinical decisions.

---

## Team

| Name | Roll No |
|------|---------|
| M. Chandrakanth Reddy | 23B81A6674 |
| Domala Poojitha | 23B81A6698 |
| Katta Poojitha | 23B81A6699 |

**Guide:** Mr. J. Phani Prasad  
**Department:** CSE (AI & ML), CVR College of Engineering

---

## Architecture

```
medilens-smart-summaries/
├── frontend/          React 19 + TanStack Router + Tailwind 4  →  http://localhost:8082
└── backend/           Python + FastAPI + SQLite               →  http://localhost:8000
    ├── main.py
    ├── routers/        auth, reports, summaries, assistant, qr, audit
    ├── services/       pdf_service, ocr_service, extraction_service, ai_service, coding_service
    ├── models.py       SQLAlchemy ORM (9 tables)
    ├── schemas.py      Pydantic v2 response shapes
    ├── security.py     JWT + bcrypt
    └── seed_data.py    Demo users + sample reports
```

---

## Quick Start

### 1 — Prerequisites

| Tool | Required | Install |
|------|----------|---------|
| Python 3.10+ | yes | python.org |
| Node.js 18+ | yes | nodejs.org |
| npm or bun | yes | included with Node |
| Tesseract OCR | for image/scanned-PDF OCR | see below |
| Poppler | for scanned PDF pages | see below |

**Tesseract install:**

```bash
# Windows — download installer from:
# https://github.com/UB-Mannheim/tesseract/wiki
# Add C:\Program Files\Tesseract-OCR to PATH
# OR set TESSERACT_CMD in backend/.env

# Ubuntu / WSL
sudo apt install tesseract-ocr

# macOS
brew install tesseract
```

**Poppler install (for scanned PDFs):**
```bash
# Windows — https://github.com/oschwartz10612/poppler-windows/releases
# Ubuntu
sudo apt install poppler-utils
# macOS
brew install poppler
```

---

### 2 — Backend setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy env file and edit if needed
copy .env.example .env

# Start the backend (auto-creates DB + seeds demo data)
uvicorn main:app --reload --port 8000
```

Backend runs at → **http://localhost:8000**  
API docs → **http://localhost:8000/docs**

---

### 3 — Frontend setup

```bash
cd frontend

# Install dependencies (first time only)
npm install

# Start dev server
npm run dev
```

Frontend runs at → **http://localhost:8082** (or 5173 / 8080 if available)

---

### 4 — Run both at once

**Windows:**
```bat
start.bat
```

**Mac / Linux:**
```bash
chmod +x start.sh
./start.sh
```

---

## Demo Login Credentials

All demo accounts use password: **`MediLens@123`**

| Role | Email |
|------|-------|
| Patient | patient@medilens.demo |
| Doctor | doctor@medilens.demo |
| Specialist | specialist@medilens.demo |
| Medical Coder | coder@medilens.demo |
| Researcher | researcher@medilens.demo |
| Insurance Provider | insurer@medilens.demo |

Two sample reports are pre-loaded for the patient account.

---

## Features

### Module 1 — Upload & Storage
- PDF, JPEG, PNG support (max 10 MB)
- Original files stored in `backend/uploads/`, never modified
- Pipeline status polling: Uploaded → Extracting → Analyzing → Completed

### Module 2 — AI Summarization
- PyMuPDF + pdfplumber for text PDFs
- pytesseract + OpenCV for images and scanned PDFs
- Rule-based medical extraction (symptoms, diagnoses, medications, labs, allergies)
- OpenAI GPT summary if `OPENAI_API_KEY` set — offline rule-based fallback if not
- ICD-10, CPT, LOINC code generation with confidence scores

### Module 3 — Medical Q&A Assistant
- Chat interface with report context
- Per-report or across-all-reports mode
- OpenAI-powered or offline heuristic fallback
- Lab trend charts (HbA1c, glucose, creatinine, etc.)
- Report comparison — lab value diffs with improve/worsen/stable trend
- Health timeline — chronological medical events

### Module 4 — Emergency QR Code
- 24-hour time-limited token
- QR renders via public QR API
- Authenticated scan required before data is shown
- Allergies, medications, conditions, recent summaries

### Module 5 — User Management & Security
- JWT (python-jose + passlib/bcrypt)
- 6 role types with role-aware summaries
- Password reset via OTP (console output locally; SMTP if configured)
- Shared records (time-limited, audited)
- Full audit log
- Row-level data isolation (users only see their own reports)

---

## Optional — OpenAI Integration

Set in `backend/.env`:

```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

Without a key, summaries still work via the offline rule-based engine.

---

## Switch to PostgreSQL / Supabase

In `backend/.env`:

```
DATABASE_URL=postgresql+psycopg2://user:password@host:5432/medilens
```

Install the driver:
```bash
pip install psycopg2-binary
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login → JWT |
| POST | /api/auth/forgot-password | Send OTP |
| POST | /api/auth/reset-password | Reset with OTP |
| GET | /api/auth/profile | Get profile |
| PATCH | /api/auth/profile | Update profile |
| POST | /api/reports/upload | Upload + process file |
| GET | /api/reports | List reports |
| GET | /api/reports/{id} | Get single report |
| DELETE | /api/reports/{id} | Delete report |
| POST | /api/reports/{id}/verify | Mark as verified |
| GET | /api/reports/{id}/download | Download original |
| GET | /api/reports/{id}/status | Pipeline status |
| GET | /api/reports/compare | Compare two reports |
| POST | /api/assistant | Q&A assistant |
| GET | /api/timeline | Health timeline |
| GET | /api/dashboard/stats | Stats |
| GET | /api/patients/me/snapshot | Health snapshot |
| GET | /api/notifications | Notifications |
| POST | /api/qr/create | Create emergency QR |
| GET | /api/qr/verify/{token} | Verify QR scan |
| GET | /api/audit | Audit log |
