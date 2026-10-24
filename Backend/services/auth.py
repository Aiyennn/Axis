"""Local account and session workflows, independent of HTTP and cookies."""
import hashlib
import hmac
import secrets
import time
import logging
from Backend.observability import log_stage
from threading import Lock
from datetime import timedelta, timezone
from dataclasses import dataclass

from sqlalchemy import select, delete
from sqlalchemy.exc import IntegrityError
from Backend.config import SESSION_SECONDS
from Backend.models.auth import CredentialModel, SessionModel
from Backend.models.db_models import UserModel, utc_now
from Backend.services.errors import AccountConflict, InvalidCredentials, SignInRequired, TooManyAttempts

logger = logging.getLogger(__name__)


def password_hash(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 600_000)
    return f"{salt}:{digest.hex()}"


def password_matches(password, stored):
    return hmac.compare_digest(password_hash(password, stored.split(":")[0]), stored)


def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()



def public_user(user):
    return {"id": user.id, "email": user.email, "name": user.display_name}


def create_session(db, user_id):
    token = secrets.token_urlsafe(32)
    db.add(SessionModel(token_hash=token_hash(token), user_id=user_id,
                        expires_at=utc_now() + timedelta(seconds=SESSION_SECONDS)))
    return token


class LoginLimiter:
    """Per-process limiter; multiple workers require an edge/shared limiter."""
    def __init__(self):
        self._attempts = {}
        self._lock = Lock()

    def check(self, key):
        now = time.monotonic()
        with self._lock:
            for expired in [k for k, (_, start) in self._attempts.items() if now - start > 300]:
                del self._attempts[expired]
            count, start = self._attempts.get(key, (0, now))
            if count >= 20:
                raise TooManyAttempts("Too many attempts. Try again in five minutes.")
            self._attempts[key] = (count + 1, start)


@dataclass(frozen=True)
class AuthResult:
    user: dict
    token: str


class AuthService:
    def __init__(self, factory):
        self.factory = factory

    def register(self, email, password):
        with log_stage(logger, "auth.password_hash"):
            hashed = password_hash(password)
        try:
            with log_stage(logger, "auth.database.register"), self.factory.begin() as db:
                user = UserModel(email=email, display_name=email.split("@")[0])
                db.add(user)
                db.flush()
                db.add(CredentialModel(user_id=user.id, email=email, password_hash=hashed))
                token = create_session(db, user.id)
                result = AuthResult(public_user(user), token)
        except IntegrityError as exc:
            raise AccountConflict("Account cannot be created with this email") from exc
        return result

    def login(self, email, password, old_token=None):
        with log_stage(logger, "auth.database.login"), self.factory.begin() as db:
            credential = db.scalar(select(CredentialModel).where(CredentialModel.email == email))
            stored = credential.password_hash if credential else "0" * 32 + ":" + "0" * 64
            if not password_matches(password, stored) or credential is None:
                raise InvalidCredentials("Invalid email or password")
            if old_token:
                db.execute(delete(SessionModel).where(SessionModel.token_hash == token_hash(old_token)))
            token = create_session(db, credential.user_id)
            result = AuthResult(public_user(db.get(UserModel, credential.user_id)), token)
        return result

    def authenticate(self, token):
        with self.factory() as db:
            session = db.get(SessionModel, token_hash(token)) if token else None
            expiry = session.expires_at if session else None
            if expiry and expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=timezone.utc)
            if not session or expiry <= utc_now():
                raise SignInRequired("Sign in to continue")
            return db.get(UserModel, session.user_id)

    def logout(self, token):
        with log_stage(logger, "auth.database.logout"), self.factory.begin() as db:
            db.execute(delete(SessionModel).where(SessionModel.token_hash == token_hash(token)))
