import unittest
import asyncio
import httpx

from fastapi import FastAPI
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session

from Backend.database import Base
from Backend.models.db_models import UserModel, TaskFactsModel, PriorityAssessmentModel, PriorityRunModel
from Backend.models.priority import PriorityRequest, PriorityContext
from Backend.engine import rank_tasks, free_blocks, hours
from Backend.services.priority_store import create_priority_run
from Backend.routers.priority import router
from pydantic import ValidationError

NOW = "2026-10-20T09:00:00+08:00"


def task(task_id="a", **changes):
    facts = dict(id=task_id, source=dict(integration="manual", accountId="local", sourceId=task_id, sourceItemKey="1"),
                 title=task_id, estimatedHours=2, importance="high", deadlineAt="2026-10-20T12:00:00+08:00",
                 isHardDeadline=True, ingestedAt=NOW)
    facts.update(changes)
    return dict(task=facts, createdAt=NOW, delayImpact="critical")


def request(tasks, **context):
    return PriorityRequest(tasks=tasks, context=dict(now=NOW, **context))


class EngineTests(unittest.TestCase):
    def test_deferred_task_is_ranked_after_work_allocated_today(self):
        normal = task('today', isHardDeadline=False, importance='low', deadlineAt=None)
        normal['delayImpact'] = 'minor'
        rows = rank_tasks(request([task('exam'), normal], bucketOverrides={'exam': 'next'})).rankings
        self.assertEqual([(row.taskId, row.priorityBucket, row.rank) for row in rows],
                         [('today', 'now', 1), ('exam', 'next', 2)])
        self.assertEqual(rows[0].plannedWork[0].start.day, 20)
        self.assertEqual(rows[1].plannedWork[0].start.day, 21)

    def test_user_move_reallocates_work_and_keeps_deadline_warnings(self):
        result = rank_tasks(request([task('exam'), task('other')], bucketOverrides={'exam': 'next'}))
        rows = {row.taskId: row for row in result.rankings}
        self.assertEqual(rows['exam'].priorityBucket, 'next')
        self.assertEqual(rows['exam'].plannedWork[0].start.day, 21)
        self.assertEqual(rows['other'].plannedWork[0].start.day, 20)
        self.assertIn('PROJECTED_DEADLINE_MISS', rows['exam'].warnings)

    def test_reorders_work_when_both_deadlines_can_be_met(self):
        a = task("A", estimatedHours=6, deadlineAt="2026-10-20T16:00:00+08:00")
        b = task("B", estimatedHours=1, importance="low", deadlineAt="2026-10-20T11:00:00+08:00")
        b["delayImpact"] = "minor"
        rows = rank_tasks(request([a, b])).rankings
        self.assertEqual([row.taskId for row in rows], ["B", "A"])
        self.assertGreater(rows[1].priorityScore, rows[0].priorityScore)
        self.assertTrue(all(row.projectedCompletionAt <= row.deadlineAt for row in rows))
        self.assertTrue(all(any(f["code"] == "DEADLINE_ORDER_REPAIRED" for f in row.decisionFacts) for row in rows))

    def test_deadline_repair_cannot_trade_one_miss_for_another(self):
        # A is impossible to finish by 10 AM. Moving it first would make B late too.
        a = task("A", estimatedHours=4, importance="low", deadlineAt="2026-10-20T10:00:00+08:00")
        a["delayImpact"] = "minor"
        b = task("B", estimatedHours=1, deadlineAt="2026-10-20T11:00:00+08:00")
        rows = rank_tasks(request([a, b])).rankings
        self.assertEqual(rows[0].taskId, "B")
        self.assertNotIn("PROJECTED_DEADLINE_MISS", rows[0].warnings)
        self.assertIn("PROJECTED_DEADLINE_MISS", rows[1].warnings)

    def test_unknown_effort_urgent_task_requires_action_now(self):
        urgent = task("urgent", estimatedHours=None, deadlineAt="2026-10-20T09:30:00+08:00")
        rows = rank_tasks(request([urgent, task("later", deadlineAt="2026-10-21T17:00:00+08:00")])).rankings
        self.assertEqual(rows[0].taskId, "urgent")
        self.assertEqual(rows[0].priorityBucket, "now")
        self.assertEqual(rows[0].tier, "deadline_at_risk")
        self.assertFalse(rows[0].plannedWork)
        self.assertTrue(any(f["code"] == "ACTION_REQUIRED" for f in rows[0].decisionFacts))

    def test_invalid_effort_rejected_and_empty_request_supported(self):
        with self.assertRaises(ValidationError):
            request([task(estimatedHours=float("inf"))])
        self.assertEqual(rank_tasks(request([])).rankings, [])

    def test_partial_capacity_does_not_claim_completion(self):
        row = rank_tasks(request([task(estimatedHours=12)], horizonDays=1)).rankings[0]
        self.assertIsNone(row.projectedCompletionAt)
        self.assertIn("EXCEEDS_REMAINING_PLANNING_CAPACITY", row.warnings)

    def test_slack_risk_and_score(self):
        result = rank_tasks(request([task()])).rankings[0]
        self.assertEqual(result.slackHours, 1)
        self.assertEqual(result.tier, "deadline_at_risk")
        self.assertEqual(result.priorityScore, 85)
        self.assertEqual(result.priorityScore, sum(result.scoreBreakdown.values()))

    def test_overlaps_and_multiday_working_capacity(self):
        ctx = request([], busyIntervals=[
            {"start": "2026-10-20T10:00:00+08:00", "end": "2026-10-20T12:00:00+08:00"},
            {"start": "2026-10-20T11:00:00+08:00", "end": "2026-10-20T13:00:00+08:00"}], horizonDays=2).context
        self.assertEqual(sum(hours(a, b) for a, b in free_blocks(ctx)), 15)

    def test_competing_tasks_do_not_share_capacity(self):
        rows = rank_tasks(request([task("a"), task("b")])).rankings
        self.assertEqual(rows[0].projectedCompletionAt.hour, 3)  # 11 AM local, stored UTC
        self.assertIn("PROJECTED_DEADLINE_MISS", rows[1].warnings)
        self.assertEqual(rows[0].plannedWork[-1].end, rows[1].plannedWork[0].start)

    def test_repeatability_and_input_order_independence(self):
        a = rank_tasks(request([task("b"), task("a")])).model_dump(mode="json")
        b = rank_tasks(request([task("a"), task("b")])).model_dump(mode="json")
        self.assertEqual(a, b)
        self.assertEqual(a["rankings"][0]["taskId"], "a")

    def test_dependencies_missing_cycles_and_completed(self):
        rows = rank_tasks(request([task("a", dependencyIds=["b"]), task("b", dependencyIds=["a"]),
                                   task("c", dependencyIds=["missing"]), task("d", status="completed")]))
        self.assertEqual(rows.excludedTaskIds, ["d"])
        self.assertTrue(all(r.tier == "blocked" and not r.plannedWork for r in rows.rankings))
        resolved = rank_tasks(request([task("a", dependencyIds=["b"]), task("b", status="completed")]))
        self.assertNotEqual(resolved.rankings[0].tier, "blocked")

    def test_unknown_facts_and_date_only_policy(self):
        t = task(deadlineAt=None, deadlineDate="2026-10-20", estimatedHours=None, importance=None)
        t["delayImpact"] = "unknown"
        row = rank_tasks(request([t])).rankings[0]
        self.assertEqual(row.priorityScore, 0)
        self.assertIsNone(row.deadlineAt)
        self.assertIn("DATE_ONLY_DEADLINE_UNRESOLVED", row.warnings)
        self.assertFalse(row.plannedWork)
        resolved = rank_tasks(request([t], dateOnlyDeadlineTime="17:00:00")).rankings[0]
        self.assertIsNotNone(resolved.deadlineAt)

    def test_overdue_hard_deadline_and_horizon(self):
        row = rank_tasks(request([task(deadlineAt="2026-10-19T12:00:00+08:00")])).rankings[0]
        self.assertEqual(row.tier, "deadline_at_risk")
        self.assertIn("DEADLINE_OVERDUE", row.warnings)
        row = rank_tasks(request([task(deadlineAt="2027-10-20T12:00:00+08:00")])).rankings[0]
        self.assertIsNone(row.slackHours)
        self.assertIn("DEADLINE_BEYOND_PLANNING_HORIZON", row.warnings)

    def test_weekends_and_timezone(self):
        ctx = PriorityContext(now="2026-10-23T17:00:00+08:00", horizonDays=4)
        self.assertEqual(sum(hours(a, b) for a, b in free_blocks(ctx)), 10)
        # Across the US fall DST transition: each local working day still has 9 hours.
        ctx = PriorityContext(now="2026-10-30T09:00:00-04:00", timezone="America/New_York", horizonDays=4)
        self.assertEqual(sum(hours(a, b) for a, b in free_blocks(ctx)), 18)

    def test_preview_endpoint_validation(self):
        app = FastAPI()
        app.include_router(router)
        async def check():
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
                body = request([task()]).model_dump(mode="json")
                self.assertEqual((await client.post("/api/priority/preview", json=body)).status_code, 200)
                body["context"]["timezone"] = "Invalid/Zone"
                self.assertEqual((await client.post("/api/priority/preview", json=body)).status_code, 422)
                body = request([task()]).model_dump(mode="json")
                body["tasks"].append(body["tasks"][0])
                self.assertEqual((await client.post("/api/priority/preview", json=body)).status_code, 422)
        asyncio.run(asyncio.wait_for(check(), timeout=10))

    def test_persistence_latest_versions_and_user_isolation(self):
        engine = create_engine("sqlite://")
        @event.listens_for(engine, "connect")
        def foreign_keys(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")
        Base.metadata.create_all(engine)
        with Session(engine) as db:
            db.add_all([UserModel(id="u1"), UserModel(id="u2")])
            db.flush()
            for uid in ("u1", "u2"):
                db.add(TaskFactsModel.from_normalized(task()["task"], user_id=uid))
            db.add(TaskFactsModel.from_normalized(task(estimatedHours=1)["task"], user_id="u1", version=2))
            db.flush()
            run_id, result = create_priority_run(db, user_id="u1", context=PriorityContext(now=NOW), delay_impacts={"a": "minor"})
            db.commit()
            self.assertEqual(len(result.rankings), 1)
            self.assertEqual(result.rankings[0].taskVersion, 2)
            self.assertEqual(result.rankings[0].slackHours, 2)
            stored = db.query(PriorityAssessmentModel).one()
            self.assertEqual(stored.user_id, "u1")
            self.assertEqual(stored.run_id, run_id)
            self.assertEqual(stored.explanation_status, "pending")
            self.assertIsNone(stored.context_snapshot)
            run = db.get(PriorityRunModel, ("u1", run_id))
            self.assertEqual(run.context_snapshot["tasks"][0]["delayImpact"], "minor")
            with self.assertRaises(ValueError):
                create_priority_run(db, user_id="missing", context=PriorityContext(now=NOW))
        engine.dispose()


if __name__ == "__main__":
    unittest.main()
