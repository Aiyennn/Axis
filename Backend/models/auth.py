"""Local credentials and revocable sessions, separate from task/source data."""
from pydantic import BaseModel, Field, field_validator
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
