"""
Auth router: register, login, logout, forgot-password, reset-password,
             profile read/update, change-password.
"""
from __future__ import annotations

import os
import random
import string
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from database import get_db
from models import AuditLog, User
from schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    ProfileResponse,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UpdateProfileRequest,
)
from security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])

SMTP_CONFIGURED = bool(os.getenv("SMTP_HOST"))


def _send_or_print_otp(email: str, otp: str, subject: str, body: str) -> None:
    """Send via SMTP if configured; otherwise print to console."""
    if SMTP_CONFIGURED:
        try:
            import smtplib
            from email.mime.text import MIMEText

            msg = MIMEText(body)
            msg["Subject"] = subject
            msg["From"] = os.getenv("SMTP_FROM", "noreply@medilens.local")
            msg["To"] = email
            with smtplib.SMTP(os.getenv("SMTP_HOST", ""), int(os.getenv("SMTP_PORT", "587"))) as s:
                s.starttls()
                s.login(os.getenv("SMTP_USER", ""), os.getenv("SMTP_PASS", ""))
                s.send_message(msg)
        except Exception as exc:
            print(f"[MediLens] SMTP error ({exc}). Printing OTP to console instead.")
            print(f"[MediLens] OTP for {email}: {otp}")
    else:
        print(f"\n[MediLens] ✉  Password reset OTP for {email}: {otp}\n")


def _gen_otp(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


def _audit(db: Session, user_id: str | None, action: str, resource: str, detail: str, ip: str) -> None:
    db.add(AuditLog(user_id=user_id, action=action, resource=resource, detail=detail, ip_address=ip))
    db.commit()


VALID_ROLES = {"patient", "doctor", "specialist", "medical_coder", "researcher", "insurance_provider"}

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    clean_email = str(body.email).strip().lower()
    role = (body.role or "patient").strip().lower()

    if role not in VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role '{role}'. Allowed roles: {', '.join(sorted(VALID_ROLES))}",
        )

    if role in ("doctor", "specialist"):
        if not body.license_number or not body.license_number.strip():
            raise HTTPException(
                status_code=400,
                detail="A medical license number is required for doctor and specialist accounts.",
            )

    existing = db.query(User).filter(User.email.ilike(clean_email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered.")

    user = User(
        email=clean_email,
        full_name=(body.full_name or "").strip(),
        hashed_password=hash_password(body.password),
        role=role,
        license_number=body.license_number.strip() if body.license_number else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id})
    _audit(
        db,
        user.id,
        "register",
        "user",
        f"New {user.role} account created ({user.email})",
        request.client.host if request.client else "",
    )
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        license_number=user.license_number,
    )


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    clean_email = str(body.email).strip().lower()
    user = db.query(User).filter(User.email.ilike(clean_email)).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled.")

    token = create_access_token({"sub": user.id})
    _audit(
        db,
        user.id,
        "login",
        "auth",
        f"User signed in ({user.email}, role={user.role})",
        request.client.host if request.client else "",
    )
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        license_number=user.license_number,
    )


@router.get("/me", response_model=ProfileResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/logout", status_code=204)
def logout(current_user: User = Depends(get_current_user)):
    # JWT is stateless; client discards the token.
    return None


@router.post("/forgot-password", status_code=204)
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        # Neutral response — never reveal whether the account exists
        return None
    otp = _gen_otp()
    user.reset_otp = otp
    user.reset_otp_expires = datetime.now(timezone.utc) + timedelta(minutes=10)
    db.commit()
    _send_or_print_otp(
        body.email,
        otp,
        subject="MediLens — Password Reset Code",
        body=f"Your MediLens password reset code is: {otp}\nIt expires in 10 minutes.",
    )
    return None


@router.post("/reset-password", status_code=204)
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not user.reset_otp:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code.")
    if user.reset_otp != body.otp:
        raise HTTPException(status_code=400, detail="Incorrect reset code.")
    now = datetime.now(timezone.utc)
    expires = user.reset_otp_expires
    if expires and (expires.tzinfo is None):
        expires = expires.replace(tzinfo=timezone.utc)
    if not expires or now > expires:
        raise HTTPException(status_code=400, detail="Reset code has expired.")
    user.hashed_password = hash_password(body.new_password)
    user.reset_otp = None
    user.reset_otp_expires = None
    db.commit()
    return None


@router.get("/profile", response_model=ProfileResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/profile", response_model=ProfileResponse)
def update_profile(
    body: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.full_name is not None:
        current_user.full_name = body.full_name
    if body.license_number is not None:
        current_user.license_number = body.license_number
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/change-password", status_code=204)
def change_password(
    body: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    current_user.hashed_password = hash_password(body.new_password)
    db.commit()
    return None
