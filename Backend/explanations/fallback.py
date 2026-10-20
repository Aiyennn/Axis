"""Templates derived only from the saved engine output."""
from .contracts import Briefing, TaskExplanation, ExplanationBatch


def fallback_batch(snapshot):
    tasks = sorted(snapshot["tasks"], key=lambda task: task["rank"])
    explanations = []
    for task in tasks:
        summary = f"Priority {task['rank']}: {task['title']} is in {task['bucket']}."
        codes = [fact["code"] for fact in task["decisionFacts"]]
        context = f"The engine assigned {task['score']}/100 in the {task['tier']} tier."
        if "DEADLINE_ORDER_REPAIRED" in codes:
            context += " Its order was adjusted to avoid a deadline miss without introducing another."
        if "NOT_ALLOCATED_WITHOUT_EFFORT" in task["warnings"]:
            context += " Estimate remaining effort before work time can be allocated."
        explanations.append(TaskExplanation(
            assessmentId=task["assessmentId"], summary=summary, context=context,
            risks=[warning.replace("_", " ").capitalize() for warning in task["warnings"]],
            decisionFactCodes=list(dict.fromkeys(codes)),
        ))
    summary = f"The engine ranked {len(tasks)} pending tasks."
    if tasks:
        summary += f" First in the ranked list: {tasks[0]['title']}."
    conflicts = sum("PROJECTED_DEADLINE_MISS" in task["warnings"] for task in tasks)
    return ExplanationBatch(
        briefing=Briefing(summary=summary, tradeOffs=[f"{conflicts} tasks have projected deadline misses."] if conflicts else []),
        taskExplanations=explanations,
    )
