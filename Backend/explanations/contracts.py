from pydantic import Field
from Backend.models.integrations import IngestionModel


class Briefing(IngestionModel):
    summary: str = Field(min_length=1, max_length=2500)
    tradeOffs: list[str] = Field(default_factory=list, max_length=30)


class TaskExplanation(IngestionModel):
    assessmentId: str
    summary: str = Field(min_length=1, max_length=1500)
    context: str = Field(min_length=1, max_length=2500)
    risks: list[str] = Field(default_factory=list, max_length=30)
    relatedTaskIds: list[str] = Field(default_factory=list, max_length=30)
    decisionFactCodes: list[str] = Field(min_length=1, max_length=30)


class ExplanationBatch(IngestionModel):
    briefing: Briefing
    taskExplanations: list[TaskExplanation] = Field(max_length=500)


def validate_batch(value, snapshot) -> ExplanationBatch:
    batch = ExplanationBatch.model_validate(value)
    assessments = {item["assessmentId"]: item for item in snapshot["tasks"]}
    task_ids = {item["taskId"] for item in snapshot["tasks"]}
    returned = [item.assessmentId for item in batch.taskExplanations]
    if len(returned) != len(set(returned)) or set(returned) != set(assessments):
        raise ValueError("Explanations must cover each assessment exactly once")
    for item in batch.taskExplanations:
        original = assessments[item.assessmentId]
        codes = {fact["code"] for fact in original["decisionFacts"]}
        if not set(item.decisionFactCodes) <= codes:
            raise ValueError("Unsupported decision fact reference")
        if not set(item.relatedTaskIds) <= task_ids - {original["taskId"]}:
            raise ValueError("Unknown or self-related task reference")
    return batch
