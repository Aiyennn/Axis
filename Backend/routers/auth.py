import time
from threading import Lock

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from Backend.database import get_db
from Backend.models.auth import CredentialModel, SessionModel
from Backend.models.db_models import UserModel
from Backend.services.auth import (
    COOKIE, check_origin, create_session, current_user, password_hash,
    password_matches, token_hash,
)

router = APIRouter(prefix="/api/auth", tags=["authentication"])
_attempts = {}
_lock = Lock()


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=6, max_length=128)

    @field_validator("email")
    @classmethod
    def valid_email(cls, value):
        value = value.strip().lower()
        if value.count("@") != 1 or any(c.isspace() for c in value):
            raise ValueError("Enter an email address")
        return value


def throttle(request):
    # Per-process limiter for local deployment; use an edge/shared limiter
    # when deploying multiple workers.
    key = request.client.host if request.client else "unknown"
    now = time.monotonic()
    with _lock:
        for expired in [k for k, (_, start) in _attempts.items() if now - start > 300]:
            del _attempts[expired]
        count, start = _attempts.get(key, (0, now))
        if count >= 20:
            raise HTTPException(429, "Too many attempts. Try again in five minutes.")
        _attempts[key] = (count + 1, start)


def public_user(user):
    return {"id": user.id, "email": user.email, "name": user.display_name}


@router.post("/register")
def register(body: Credentials, request: Request, response: Response, db=Depends(get_db)):
    check_origin(request)
    throttle(request)
    user = UserModel(email=body.email, display_name=body.email.split("@")[0])
    db.add(user)
    db.flush()
    db.add(CredentialModel(user_id=user.id, email=body.email, password_hash=password_hash(body.password)))
    create_session(db, user.id, response)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Account cannot be created with this email")
    return public_user(user)


@router.post("/login")
def login(body: Credentials, request: Request, response: Response, db=Depends(get_db)):
    check_origin(request)
    throttle(request)
    credential = db.scalar(select(CredentialModel).where(CredentialModel.email == body.email))
    stored = credential.password_hash if credential else "0" * 32 + ":" + "0" * 64
    if not password_matches(body.password, stored) or credential is None:
        raise HTTPException(401, "Invalid email or password")
    old = request.cookies.get(COOKIE)
    previous = db.get(SessionModel, token_hash(old)) if old else None
    if previous:
        db.delete(previous)
    create_session(db, credential.user_id, response)
    db.commit()
    return public_user(db.get(UserModel, credential.user_id))


@router.get("/me")
def me(user=Depends(current_user)):
    return public_user(user)


@router.post("/logout")
def logout(request: Request, response: Response, user=Depends(current_user), db=Depends(get_db)):
    session = db.get(SessionModel, token_hash(request.cookies[COOKIE]))
    db.delete(session)
    db.commit()
    response.delete_cookie(COOKIE, path="/")
    return {"ok": True}
