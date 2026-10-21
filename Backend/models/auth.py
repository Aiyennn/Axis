"""Local credentials and revocable sessions, separate from task/source data."""
from sqlalchemy import Column, String, DateTime, ForeignKey
from Backend.database import Base


class CredentialModel(Base):
    __tablename__ = "credentials"
    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)


class SessionModel(Base):
    __tablename__ = "sessions"
    token_hash = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
