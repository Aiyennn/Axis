from sqlalchemy.orm import Session
from Backend.models.db_models import TaskModel, CalendarEventModel, ChatMessageModel

SEED_TASKS = [
    {
        "id": "task-1",
        "title": "Client Hero Revision",
        "description": "Revise homepage hero layout based on client feedback before noon invoice lock.",
        "source": "email",
        "source_label": "Client Email",
        "deadline": "Today, 12:00 PM",
        "is_hard_deadline": True,
        "estimated_hours": 2.0,
        "importance": "high",
        "status": "pending",
        "priority_score": 92,
        "priority_bucket": "now",
        "score_breakdown": {
            "deadlineProximity": 38,
            "consequenceWeight": 25,
            "calendarFit": 15,
            "importanceScore": 14
        },
        "reasoning": "Hard noon client deadline. Delay blocks invoice generation and contract milestone payment.",
        "consequences_of_delay": "Blocks invoice approval; risks delaying client weekly disbursement."
    },
    {
        "id": "task-2",
        "title": "CS401 Distributed Systems Midterm Study",
        "description": "Review consensus algorithms (Raft & Paxos) and RPC failure handling for tomorrow morning exam.",
        "source": "canvas",
        "source_label": "CS401 Canvas",
        "deadline": "Tomorrow, 8:00 AM",
        "is_hard_deadline": True,
        "estimated_hours": 3.0,
        "importance": "high",
        "status": "pending",
        "priority_score": 78,
        "priority_bucket": "next",
        "score_breakdown": {
            "deadlineProximity": 28,
            "consequenceWeight": 22,
            "calendarFit": 16,
            "importanceScore": 12
        },
        "reasoning": "High-stakes university midterm tomorrow. Slotted into afternoon focus window after morning class.",
        "consequences_of_delay": "Reduces prep window before 8 AM exam tomorrow."
    },
    {
        "id": "task-3",
        "title": "Ethics Essay Outline",
        "description": "Draft introductory thesis on AI alignment frameworks for PHIL210.",
        "source": "canvas",
        "source_label": "PHIL210 Canvas",
        "deadline": "Friday, 11:59 PM",
        "is_hard_deadline": False,
        "estimated_hours": 1.5,
        "importance": "medium",
        "status": "pending",
        "priority_score": 64,
        "priority_bucket": "next",
        "score_breakdown": {
            "deadlineProximity": 18,
            "consequenceWeight": 16,
            "calendarFit": 18,
            "importanceScore": 12
        },
        "reasoning": "Flexible academic milestone due Friday. Good candidate for deferral if urgent work spills over.",
        "consequences_of_delay": "Minimal impact if deferred to Thursday afternoon."
    },
    {
        "id": "task-4",
        "title": "Client Bug Report: Auth Token Expiration",
        "description": "Investigate refresh token race condition reported by client QA team.",
        "source": "email",
        "source_label": "Client Email",
        "deadline": "Thursday, 5:00 PM",
        "is_hard_deadline": False,
        "estimated_hours": 1.5,
        "importance": "medium",
        "status": "pending",
        "priority_score": 45,
        "priority_bucket": "later",
        "score_breakdown": {
            "deadlineProximity": 14,
            "consequenceWeight": 15,
            "calendarFit": 10,
            "importanceScore": 6
        },
        "reasoning": "Non-blocking issue for staging environment. Scheduled for post-midterm focus block.",
        "consequences_of_delay": "None immediately; due later this week."
    },
    {
        "id": "task-5",
        "title": "Pick Up Lab Course Materials",
        "description": "Visit campus bookstore before 6 PM to collect physical kit.",
        "source": "task",
        "source_label": "Personal Task",
        "deadline": "Thursday, 6:00 PM",
        "is_hard_deadline": False,
        "estimated_hours": 0.5,
        "importance": "low",
        "status": "pending",
        "priority_score": 35,
        "priority_bucket": "later",
        "score_breakdown": {
            "deadlineProximity": 12,
            "consequenceWeight": 8,
            "calendarFit": 10,
            "importanceScore": 5
        },
        "reasoning": "Low urgency personal errand. Can be grouped with tomorrow campus trip.",
        "consequences_of_delay": "None; can be collected tomorrow."
    },
    {
        "id": "task-6",
        "title": "Review Pull Request #42: Auth Rate Limiter",
        "description": "Review security patch for JWT session handling before deploying staging build.",
        "source": "github",
        "source_label": "GitHub PR #42",
        "deadline": "Today, 4:00 PM",
        "is_hard_deadline": False,
        "estimated_hours": 1.0,
        "importance": "medium",
        "status": "pending",
        "priority_score": 72,
        "priority_bucket": "next",
        "score_breakdown": {
            "deadlineProximity": 26,
            "consequenceWeight": 20,
            "calendarFit": 16,
            "importanceScore": 10
        },
        "reasoning": "Unblocks team backend deployment. Fits cleanly into afternoon focus gap.",
        "consequences_of_delay": "Delays backend team staging release."
    },
    {
        "id": "task-7",
        "title": "Update Notion Sprint Roadmap & Specs",
        "description": "Sync quarterly deliverables and milestone progress in the client Notion workspace.",
        "source": "notion",
        "source_label": "Notion Workspace",
        "deadline": "Friday, 5:00 PM",
        "is_hard_deadline": False,
        "estimated_hours": 1.0,
        "importance": "low",
        "status": "pending",
        "priority_score": 38,
        "priority_bucket": "later",
        "score_breakdown": {
            "deadlineProximity": 10,
            "consequenceWeight": 12,
            "calendarFit": 11,
            "importanceScore": 5
        },
        "reasoning": "Non-blocking documentation update. Postponed until primary client deliverable is complete.",
        "consequences_of_delay": "Roadmap notes updated on weekly cadence."
    }
]

SEED_CALENDAR_EVENTS = [
    {
        "id": "cal-1",
        "title": "CS401 Distributed Systems Lecture",
        "start_hour": 9.5,
        "end_hour": 11.0,
        "display_time": "9:30 AM – 11:00 AM",
        "type": "class"
    },
    {
        "id": "cal-2",
        "title": "Client Standup Call",
        "start_hour": 14.0,
        "end_hour": 14.5,
        "display_time": "2:00 PM – 2:30 PM",
        "type": "meeting"
    }
]

SEED_CHAT_MESSAGES = [
    {
        "id": "msg-1",
        "sender": "assistant",
        "text": "Good morning! I've unified your Gmail inbox, GitHub pull requests, Notion workspace, Canvas portal, and calendar in PostgreSQL. You have urgent work scheduled today. I recommend focusing on the Client Hero Revision first due to its hard noon deadline.",
        "timestamp": "8:05 AM",
        "proposal": None
    }
]

def seed_database(db: Session, force: bool = False):
    """Seed initial tasks, calendar events, and chat messages into PostgreSQL."""
    if force:
        db.query(TaskModel).delete()
        db.query(CalendarEventModel).delete()
        db.query(ChatMessageModel).delete()
        db.commit()

    if db.query(TaskModel).count() == 0:
        for t in SEED_TASKS:
            db.add(TaskModel(**t))
        db.commit()

    if db.query(CalendarEventModel).count() == 0:
        for c in SEED_CALENDAR_EVENTS:
            db.add(CalendarEventModel(**c))
        db.commit()

    if db.query(ChatMessageModel).count() == 0:
        for m in SEED_CHAT_MESSAGES:
            db.add(ChatMessageModel(**m))
        db.commit()

