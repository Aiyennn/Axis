import hashlib
import hmac
import os
import secrets
from datetime import timedelta, timezone

from fastapi import Depends, HTTPException, Request
from Backend.database import get_db
from Backend.models.auth import SessionModel
from Backend.models.db_models import UserModel, utc_now

COOKIE = "axis_session"
SESSION_SECONDS = 60 * 60 * 24 * 7


def password_hash(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 600_000)
    return f"{salt}:{digest.hex()}"


def password_matches(password, stored):
    return hmac.compare_digest(password_hash(password, stored.split(":")[0]), stored)


def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


def allowed_origins():
    return os.getenv("FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")


def check_origin(request: Request):
    if request.method in {"POST", "PATCH", "PUT", "DELETE"}:
        origin = request.headers.get("origin")
        # Browser mutations require an allowed origin. Non-browser clients use
        # an explicit header, which also forces a CORS preflight in browsers.
        if origin and origin not in allowed_origins():
            raise HTTPException(403, "Untrusted origin")
        if request.headers.get("x-axis-request") != "1":
            raise HTTPException(403, "Missing request header")


def current_user(request: Request, db=Depends(get_db)):
    check_origin(request)
    token = request.cookies.get(COOKIE)
    session = db.get(SessionModel, token_hash(token)) if token else None
    expiry = session.expires_at if session else None
    if expiry and expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    if not session or expiry <= utc_now():
        raise HTTPException(401, "Sign in to continue")
    return db.get(UserModel, session.user_id)


def create_session(db, user_id, response):
    token = secrets.token_urlsafe(32)
    db.add(SessionModel(token_hash=token_hash(token), user_id=user_id,
                        expires_at=utc_now() + timedelta(seconds=SESSION_SECONDS)))
    response.set_cookie(COOKIE, token, httponly=True, samesite="lax",
                        secure=os.getenv("COOKIE_SECURE", "false").lower() == "true",
                        max_age=SESSION_SECONDS, path="/")
