from typing import List, Optional, Literal
from pydantic import BaseModel, Field

PriorityBucket = Literal['now', 'next', 'later']
SourceType = Literal['email', 'canvas', 'calendar', 'task', 'notion', 'github']
ImportanceLevel = Literal['high', 'medium', 'low']

class ScoreBreakdownSchema(BaseModel):
    deadlineProximity: float = 0
    consequenceWeight: float = 0
    calendarFit: float = 0
    importanceScore: float = 0

class TaskSchema(BaseModel):
    id: str
    title: str
    description: Optional[str] = ""
    source: SourceType
    sourceLabel: str
    deadline: str
    isHardDeadline: bool = False
    estimatedHours: float = 1.0
    importance: ImportanceLevel = "medium"
    status: Literal['pending', 'completed'] = "pending"
    priorityScore: int = 50
    priorityBucket: PriorityBucket = "next"
    scoreBreakdown: Optional[ScoreBreakdownSchema] = None
    reasoning: Optional[str] = ""
    consequencesOfDelay: Optional[str] = ""

class CalendarEventSchema(BaseModel):
    id: str
    title: str
    startHour: float
    endHour: float
    displayTime: str
    type: Literal['class', 'meeting', 'busy'] = "busy"

class PlanMoveSchema(BaseModel):
    taskId: str
    taskTitle: str
    fromBucket: PriorityBucket
    toBucket: PriorityBucket

class PlanChangeProposalSchema(BaseModel):
    id: str
    requestedPrompt: str
    moves: List[PlanMoveSchema]
    tradeOffs: List[str]
    requiresApproval: bool = True

class ChatRequest(BaseModel):
    message: str
    tasks: List[TaskSchema] = Field(default_factory=list)
    calendarEvents: List[CalendarEventSchema] = Field(default_factory=list)

class ChatResponse(BaseModel):
    reply: str
    proposal: Optional[PlanChangeProposalSchema] = None
    engine: str = "scripted-demo"

