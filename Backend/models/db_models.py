from datetime import datetime, timezone
import uuid

from sqlalchemy import (
    Column, String, Float, Boolean, Integer, JSON, Text, Date, DateTime,
    CheckConstraint, ForeignKey, ForeignKeyConstraint, Index,
)
from sqlalchemy.orm import relationship
from Backend.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class UserModel(Base):
    """Application identity, ready to link to a future login provider.

    Create a local user before login is implemented. Provider and subject must
    come from verified authentication later, never from task ingestion payloads.
    No passwords or authentication tokens are stored in this model.
    """

    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    display_name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    auth_provider = Column(String, nullable=True)
    auth_subject = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    task_facts = relationship("TaskFactsModel", back_populates="user")

    __table_args__ = (
        CheckConstraint(
            "(auth_provider IS NULL AND auth_subject IS NULL) OR "
            "(auth_provider IS NOT NULL AND auth_subject IS NOT NULL)",
            name="ck_user_auth_identity",
        ),
        Index("uq_user_auth_identity", "auth_provider", "auth_subject", unique=True),
    )


class TaskFactsModel(Base):
    """One validated task revision. Insert a new version when facts change.

    Separate from the legacy demo TaskModel. The caller assigns increasing
    versions per task, preserving facts referenced by historical assessments.
    JSON fields contain JSON-safe values, never datetime or Pydantic objects.
    Replace JSON values as a whole when editing; nested mutations aren't tracked.
    """

    __tablename__ = "task_facts"
    user_id = Column(String, ForeignKey("users.id", ondelete="RESTRICT"), primary_key=True)
    id = Column(String, primary_key=True)
    version = Column(Integer, primary_key=True, default=1)
    integration = Column(String, nullable=False)
    account_id = Column(String, nullable=False)
    source_id = Column(String, nullable=False)
    source_item_key = Column(String, nullable=False)
    source_url = Column(Text, nullable=True)
    source_updated_at = Column(DateTime(timezone=True), nullable=True)
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=False, default="")
    deadline_at = Column(DateTime(timezone=True), nullable=True)
    deadline_date = Column(Date, nullable=True)
    is_hard_deadline = Column(Boolean, nullable=True)
    estimated_hours = Column(Float, nullable=True)
    importance = Column(String, nullable=True)
    consequences_of_delay = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="pending")
    dependency_ids = Column(JSON, nullable=False, default=list)
    evidence = Column(JSON, nullable=False, default=list)
    # Optional original content used to validate extracted quotes. Store a
    # snapshot per revision; never store integration credentials here.
    source_snapshot = Column(JSON, nullable=True)
    requires_review = Column(Boolean, nullable=False, default=False)
    ingested_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    assessments = relationship("PriorityAssessmentModel", back_populates="task_facts")
    user = relationship("UserModel", back_populates="task_facts")

    __table_args__ = (
        CheckConstraint("version >= 1", name="ck_task_facts_version"),
        CheckConstraint("length(title) > 0", name="ck_task_facts_title"),
        CheckConstraint("estimated_hours IS NULL OR estimated_hours > 0", name="ck_task_facts_effort"),
        CheckConstraint("deadline_at IS NULL OR deadline_date IS NULL", name="ck_task_facts_deadline"),
        CheckConstraint("importance IS NULL OR importance IN ('high', 'medium', 'low')", name="ck_task_facts_importance"),
        CheckConstraint("status IN ('pending', 'completed', 'cancelled')", name="ck_task_facts_status"),
        CheckConstraint("integration IN ('gmail', 'notion', 'github', 'canvas', 'google_calendar', 'manual')", name="ck_task_facts_integration"),
        Index("ix_task_facts_source", "user_id", "integration", "account_id", "source_id", "source_item_key"),
    )

    @classmethod
    def from_normalized(cls, task, *, user_id, version=1, source_snapshot=None):
        """Owner is supplied separately by trusted application context."""
        from Backend.models.integrations import NormalizedTask

        task = NormalizedTask.model_validate(task)
        return cls(
            user_id=user_id, id=task.id, version=version, integration=task.source.integration,
            account_id=task.source.accountId, source_id=task.source.sourceId,
            source_item_key=task.source.sourceItemKey,
            source_url=str(task.source.sourceUrl) if task.source.sourceUrl else None,
            source_updated_at=task.source.updatedAt.astimezone(timezone.utc) if task.source.updatedAt else None, title=task.title,
            description=task.description, deadline_at=task.deadlineAt.astimezone(timezone.utc) if task.deadlineAt else None,
            deadline_date=task.deadlineDate, is_hard_deadline=task.isHardDeadline,
            estimated_hours=task.estimatedHours, importance=task.importance,
            consequences_of_delay=task.consequencesOfDelay, status=task.status,
            dependency_ids=task.dependencyIds,
            evidence=[item.model_dump(mode="json") for item in task.evidence],
            source_snapshot=source_snapshot, requires_review=task.requiresReview,
            ingested_at=task.ingestedAt.astimezone(timezone.utc),
        )


class CalendarSourceModel(Base):
    """User-owned normalized calendar records; not task cards or ingestion jobs."""
    __tablename__ = "calendar_sources"
    user_id = Column(String, ForeignKey("users.id", ondelete="RESTRICT"), primary_key=True)
    account_id = Column(String, primary_key=True)
    source_id = Column(String, primary_key=True)
    record = Column(JSON, nullable=False)
    content_hash = Column(String, nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)


class PriorityRunModel(Base):
    """Shared input/briefing for a ranking generation; one snapshot per run."""
    __tablename__ = "priority_runs"
    user_id = Column(String, ForeignKey("users.id", ondelete="RESTRICT"), primary_key=True)
    id = Column(String, primary_key=True)
    generation = Column(Integer, nullable=False)
    context_snapshot = Column(JSON, nullable=False)
    calendar_snapshot = Column(JSON, nullable=False, default=dict)
    engine_version = Column(String, nullable=False)
    policy_version = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    briefing = Column(JSON, nullable=False, default=dict)
    explanation_status = Column(String, nullable=False, default="pending")
    explanation_model = Column(String, nullable=True)
    explanation_prompt_version = Column(String, nullable=True)
    explanation_generated_at = Column(DateTime(timezone=True), nullable=True)
    explanation_attempt = Column(String, nullable=True)
    explanation_error = Column(String, nullable=True)
    __table_args__ = (
        Index("uq_priority_run_generation", "user_id", "generation", unique=True),
        CheckConstraint("generation >= 1", name="ck_priority_run_generation"),
        CheckConstraint("explanation_status IN ('pending','generating','ready','fallback','stale')",
                        name="ck_priority_run_status"),
    )


class PriorityAssessmentModel(Base):
    """Deterministic decision plus an optional, separately tracked explanation.

    Each run assesses a specific task revision. Ranking only has meaning inside
    that run and context. Writers must reject explanations for superseded runs
    when selecting the current assessment for the frontend.
    """

    __tablename__ = "priority_assessments"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    run_id = Column(String, nullable=False, index=True)
    task_id = Column(String, nullable=False)
    task_version = Column(Integer, nullable=False)
    engine_version = Column(String, nullable=False)
    policy_version = Column(String, nullable=False)
    rank = Column(Integer, nullable=False)
    priority_score = Column(Integer, nullable=False)
    priority_bucket = Column(String, nullable=False)
    tier = Column(String, nullable=False)
    score_breakdown = Column(JSON, nullable=False, default=dict)
    decision_facts = Column(JSON, nullable=False, default=list)
    warnings = Column(JSON, nullable=False, default=list)
    # Capture clock, timezone, calendar revision and user constraints so the
    # decision can be understood later, even after today's context changes.
    context_snapshot = Column(JSON, nullable=True)  # Legacy snapshots; new runs store context once.
    generated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    explanation = Column(Text, nullable=True)
    explanation_status = Column(String, nullable=False, default="pending")
    explanation_model = Column(String, nullable=True)
    explanation_prompt_version = Column(String, nullable=True)
    explanation_generated_at = Column(DateTime(timezone=True), nullable=True)
    explanation_details = Column(JSON, nullable=True)
    task_facts = relationship("TaskFactsModel", back_populates="assessments")

    __table_args__ = (
        ForeignKeyConstraint(["user_id", "run_id"], ["priority_runs.user_id", "priority_runs.id"],
                             name="fk_assessment_run", ondelete="RESTRICT"),
        ForeignKeyConstraint(
            ["user_id", "task_id", "task_version"],
            ["task_facts.user_id", "task_facts.id", "task_facts.version"],
            name="fk_assessment_task_revision", ondelete="RESTRICT",
        ),
        CheckConstraint("rank >= 1", name="ck_assessment_rank"),
        CheckConstraint("priority_score BETWEEN 0 AND 100", name="ck_assessment_score"),
        CheckConstraint("priority_bucket IN ('now', 'next', 'later')", name="ck_assessment_bucket"),
        CheckConstraint("explanation_status IN ('pending', 'ready', 'failed', 'fallback')", name="ck_assessment_explanation_status"),
        CheckConstraint("explanation_status NOT IN ('ready', 'fallback') OR (explanation IS NOT NULL AND length(explanation) > 0)", name="ck_assessment_explanation_text"),
        Index("uq_assessment_run_task", "user_id", "run_id", "task_id", unique=True),
        Index("uq_assessment_run_rank", "user_id", "run_id", "rank", unique=True),
    )

class TaskModel(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    source = Column(String, nullable=False)
    source_label = Column(String, nullable=False)
    deadline = Column(String, nullable=False)
    is_hard_deadline = Column(Boolean, default=False)
    estimated_hours = Column(Float, default=1.0)
    importance = Column(String, default="medium")
    status = Column(String, default="pending")
    priority_score = Column(Integer, default=50)
    priority_bucket = Column(String, default="next")
    reasoning = Column(Text, default="")
    consequences_of_delay = Column(Text, default="")
    score_breakdown = Column(JSON, default=dict)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description or "",
            "source": self.source,
            "sourceLabel": self.source_label,
            "deadline": self.deadline,
            "isHardDeadline": self.is_hard_deadline,
            "estimatedHours": self.estimated_hours,
            "importance": self.importance,
            "status": self.status,
            "priorityScore": self.priority_score,
            "priorityBucket": self.priority_bucket,
            "reasoning": self.reasoning or "",
            "consequencesOfDelay": self.consequences_of_delay or "",
            "scoreBreakdown": self.score_breakdown or {
                "deadlineProximity": 0,
                "consequenceWeight": 0,
                "calendarFit": 0,
                "importanceScore": 0,
            },
        }

class CalendarEventModel(Base):
    __tablename__ = "calendar_events"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    start_hour = Column(Float, nullable=False)
    end_hour = Column(Float, nullable=False)
    display_time = Column(String, nullable=False)
    type = Column(String, default="busy")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "startHour": self.start_hour,
            "endHour": self.end_hour,
            "displayTime": self.display_time,
            "type": self.type,
        }

class ChatMessageModel(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, index=True)
    sender = Column(String, nullable=False)
    text = Column(Text, nullable=False)
    timestamp = Column(String, nullable=False)
    proposal = Column(JSON, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "sender": self.sender,
            "text": self.text,
            "timestamp": self.timestamp,
            "proposal": self.proposal,
        }

