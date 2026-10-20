"""Scripted chat for the seeded frontend demo; no model calls or ranking engine."""
import uuid
from typing import Tuple, Optional
from Backend.models.schemas import (
    TaskSchema,
    PlanChangeProposalSchema,
    PlanMoveSchema,
)

def evaluate_user_prompt(
    user_message: str,
    tasks: list[TaskSchema],
) -> Tuple[str, Optional[PlanChangeProposalSchema]]:
    """Return a scripted demo reply and optional bucket-change proposal."""
    lower = user_message.lower()

    # Case 1: Prioritize Exam prep / study
    if any(k in lower for k in ["exam", "study", "midterm", "cs401", "cs 401"]):
        proposal = PlanChangeProposalSchema(
            id=f"prop-{uuid.uuid4().hex[:8]}",
            requestedPrompt=user_message,
            moves=[
                PlanMoveSchema(
                    taskId="task-2",
                    taskTitle="CS401 Distributed Systems Midterm Study",
                    fromBucket="next",
                    toBucket="now",
                ),
                PlanMoveSchema(
                    taskId="task-1",
                    taskTitle="Client Hero Revision",
                    fromBucket="now",
                    toBucket="next",
                ),
            ],
            tradeOffs=[
                "⚠️ Delaying 'Client Hero Revision' leaves only 1.0 hour before the 12:00 PM hard invoice lock.",
                "⚠️ Risks delaying client weekly contract disbursement and invoice approval.",
                "✅ Provides contiguous 3.0 hours deep work for CS401 Exam before tomorrow morning.",
            ],
            requiresApproval=True,
        )
        reply = (
            "I've drafted a plan re-balancing proposal prioritizing your CS401 Midterm Exam prep. "
            "Please review the trade-offs below. Delaying the Client Hero Revision pushes it close to its hard noon deadline."
        )
        return reply, proposal

    # Case 2: User has only limited time before lecture (e.g., 1 hour)
    if any(k in lower for k in ["1 hour", "one hour", "quick", "short window", "before lecture"]):
        proposal = PlanChangeProposalSchema(
            id=f"prop-{uuid.uuid4().hex[:8]}",
            requestedPrompt=user_message,
            moves=[
                PlanMoveSchema(
                    taskId="task-6",
                    taskTitle="Review Pull Request #42: Auth Rate Limiter",
                    fromBucket="next",
                    toBucket="now",
                )
            ],
            tradeOffs=[
                "✅ 'Review Pull Request #42' takes only 1.0 hour and fits perfectly into your morning gap before 9:30 AM CS Lecture.",
                "⚠️ Keeps 'Client Hero Revision' in focus to be completed immediately after lecture.",
            ],
            requiresApproval=True,
        )
        reply = (
            "Since you have a 1-hour window before your 9:30 AM Distributed Systems lecture, "
            "I recommend slotting the 1.0h GitHub PR Review right now and deferring larger deep work."
        )
        return reply, proposal

    # Case 3: Explanation request about why a task is in Do Now
    if any(k in lower for k in ["why", "explain", "reason", "rationale"]):
        now_task = next((t for t in tasks if t.priorityBucket == "now"), None)
        if now_task:
            reply = (
                f"**{now_task.title}** is placed in **Do Now** with a score of {now_task.priorityScore}/100. "
                f"Primary factor: **Hard Deadline Proximity** ({now_task.deadline}). "
                f"Consequence: {now_task.reasoning} "
                "Delaying this task would cause a hard contract breach, whereas other tasks have flexible buffers."
            )
        else:
            reply = "You currently have no tasks in Do Now. All urgent responsibilities are completed or deferred."
        return reply, None

    # Case 4: General schedule check or status inquiry
    urgent_count = sum(1 for t in tasks if t.priorityBucket == "now" and t.status != "completed")
    reply = (
        f"Understood. I am coordinating your schedule with PostgreSQL. "
        f"You currently have {urgent_count} urgent task in your focus queue. "
        "You can ask me to swap tasks, prioritize study time, or adapt to sudden schedule shifts."
    )
    return reply, None

