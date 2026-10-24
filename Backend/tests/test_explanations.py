import unittest
from unittest.mock import patch
from google.genai.errors import ClientError
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from Backend.database import Base
from Backend.models.db_models import UserModel, TaskFactsModel, PriorityRunModel, CalendarSourceModel
from Backend.models.priority import PriorityContext
from Backend.services.priority_store import create_priority_run
from Backend.explanations.service import explain_run, current_run_view
from Backend.explanations.fallback import fallback_batch
from Backend.tests.test_priority_engine import task, NOW


class FakeProvider:
    model = "fake-test-provider"
    calls = 0

    def generate(self, snapshot):
        self.calls += 1
        self.snapshot = snapshot
        return fallback_batch(snapshot)


class ExplanationTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        @event.listens_for(self.engine, "connect")
        def foreign_keys(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")
        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(self.engine)
        with self.sessions.begin() as db:
            db.add_all([UserModel(id="u1"), UserModel(id="u2")])
            db.flush()
            for name in ("a", "b"):
                db.add(TaskFactsModel.from_normalized(task(name)["task"], user_id="u1"))
        self.run_id = self.new_run()

    def tearDown(self):
        self.engine.dispose()

    def new_run(self):
        with self.sessions.begin() as db:
            run_id, _ = create_priority_run(db, user_id="u1", context=PriorityContext(now=NOW))
        return run_id

    def test_pending_text_and_one_call_for_whole_run(self):
        with self.sessions() as db:
            view = current_run_view(db, user_id="u1")
            self.assertEqual(view["status"], "pending")
            self.assertTrue(all(t["reasoning"] for t in view["tasks"]))
            self.assertTrue(all(t["explanationSource"] == "rules" for t in view["tasks"]))
            original = [(t["rank"], t["score"], t["bucket"]) for t in view["tasks"]]
        provider = FakeProvider()
        self.assertEqual(explain_run(self.sessions, user_id="u1", run_id=self.run_id, provider=provider), "ready")
        self.assertEqual(provider.calls, 1)
        self.assertEqual(len(provider.snapshot["tasks"]), 2)
        with self.sessions() as db:
            view = current_run_view(db, user_id="u1")
            self.assertEqual(original, [(t["rank"], t["score"], t["bucket"]) for t in view["tasks"]])
            self.assertTrue(all(t["explanationSource"] == "ai" for t in view["tasks"]))
        explain_run(self.sessions, user_id="u1", run_id=self.run_id, provider=provider)
        self.assertEqual(provider.calls, 1)

    def test_invalid_batches_and_timeout_keep_fallback(self):
        for mode in ("missing", "duplicate", "unknown_ref", "score", "timeout"):
            class Invalid(FakeProvider):
                def generate(inner, snapshot):
                    if mode == "timeout":
                        raise TimeoutError("secret")
                    batch = fallback_batch(snapshot).model_dump()
                    if mode == "missing":
                        batch["taskExplanations"].pop()
                    elif mode == "duplicate":
                        batch["taskExplanations"][1] = batch["taskExplanations"][0]
                    elif mode == "unknown_ref":
                        batch["taskExplanations"][0]["relatedTaskIds"] = ["not-in-run"]
                    else:
                        batch["taskExplanations"][0]["priorityScore"] = 100
                    return batch
            with self.subTest(mode=mode):
                self.assertEqual(explain_run(self.sessions, user_id="u1", run_id=self.run_id,
                                            provider=Invalid(), retry=True), "fallback")
                with self.sessions() as db:
                    view = current_run_view(db, user_id="u1")
                    self.assertTrue(all(t["reasoning"] and t["explanationSource"] == "rules" for t in view["tasks"]))

    def test_provider_rejection_logs_message_without_key_or_response_body(self):
        class Rejected(FakeProvider):
            def generate(inner, snapshot):
                raise ClientError(400, {"error": {
                    "status": "INVALID_ARGUMENT",
                    "message": "Invalid schema\nfor test-secret-key",
                    "details": [{"private": "response-body-only"}],
                }})

        with patch.dict("os.environ", {"GEMINI_API_KEY": "test-secret-key"}):
            with self.assertLogs("Backend.explanations.service", level="ERROR") as logs:
                result = explain_run(self.sessions, user_id="u1", run_id=self.run_id, provider=Rejected())
        self.assertEqual(result, "fallback")
        output = " ".join(logs.output)
        self.assertIn("provider_message='Invalid schema for [REDACTED]'", output)
        self.assertIn("provider_status=INVALID_ARGUMENT", output)
        self.assertNotIn("test-secret-key", output)
        self.assertNotIn("response-body-only", output)

    def test_validation_logs_failed_fields_without_generated_content(self):
        from Backend.explanations.contracts import ExplanationBatch

        class InvalidOutput(FakeProvider):
            def generate(inner, snapshot):
                return ExplanationBatch.model_validate({"briefing": "private-generated-content"})

        with self.assertLogs("Backend.explanations.service", level="ERROR") as logs:
            result = explain_run(self.sessions, user_id="u1", run_id=self.run_id, provider=InvalidOutput())
        self.assertEqual(result, "fallback")
        output = " ".join(logs.output)
        self.assertIn('"validation_schema": "ExplanationBatch"', output)
        self.assertIn('"loc": ["taskExplanations"], "type": "missing"', output)
        self.assertNotIn("private-generated-content", output)

    def test_new_run_during_generation_discards_old_response(self):
        parent = self
        class Delayed(FakeProvider):
            def generate(inner, snapshot):
                parent.new_run()
                return fallback_batch(snapshot)
        self.assertEqual(explain_run(self.sessions, user_id="u1", run_id=self.run_id, provider=Delayed()), "stale")
        with self.sessions() as db:
            self.assertNotEqual(current_run_view(db, user_id="u1")["runId"], self.run_id)
            self.assertEqual(db.get(PriorityRunModel, ("u1", self.run_id)).explanation_status, "stale")

    def test_changed_task_requires_new_ranking(self):
        with self.sessions.begin() as db:
            db.add(TaskFactsModel.from_normalized(task("a", estimatedHours=3)["task"], user_id="u1", version=2))
        provider = FakeProvider()
        self.assertEqual(explain_run(self.sessions, user_id="u1", run_id=self.run_id, provider=provider), "stale")
        self.assertEqual(provider.calls, 0)
        with self.sessions() as db:
            self.assertTrue(current_run_view(db, user_id="u1")["requiresReprioritization"])

    def test_owner_isolation_and_rules_mode(self):
        with self.assertRaises(ValueError):
            explain_run(self.sessions, user_id="u2", run_id=self.run_id, provider=FakeProvider())
        self.assertEqual(explain_run(self.sessions, user_id="u1", run_id=self.run_id, use_ai=False), "fallback")
        with self.sessions() as db:
            self.assertIsNone(current_run_view(db, user_id="u2"))

    def test_retry_token_prevents_late_attempt_overwrite(self):
        parent = self
        class Older(FakeProvider):
            def generate(inner, snapshot):
                explain_run(parent.sessions, user_id="u1", run_id=parent.run_id,
                            provider=FakeProvider(), retry=True)
                return fallback_batch(snapshot)
        self.assertEqual(explain_run(self.sessions, user_id="u1", run_id=self.run_id, provider=Older()), "superseded")
        with self.sessions() as db:
            self.assertEqual(current_run_view(db, user_id="u1")["status"], "ready")

    def test_calendar_change_during_generation_discards_response(self):
        parent = self
        class ChangedCalendar(FakeProvider):
            def generate(inner, snapshot):
                with parent.sessions.begin() as db:
                    db.add(CalendarSourceModel(user_id="u1", account_id="a", source_id="c",
                                               record={}, content_hash="changed"))
                return fallback_batch(snapshot)
        self.assertEqual(explain_run(self.sessions, user_id="u1", run_id=self.run_id,
                                    provider=ChangedCalendar()), "stale")

    def test_empty_run_has_briefing_without_provider_call(self):
        with self.sessions.begin() as db:
            run_id, _ = create_priority_run(db, user_id="u2", context=PriorityContext(now=NOW))
        provider = FakeProvider()
        self.assertEqual(explain_run(self.sessions, user_id="u2", run_id=run_id, provider=provider), "fallback")
        self.assertEqual(provider.calls, 0)
        with self.sessions() as db:
            view = current_run_view(db, user_id="u2")
            self.assertEqual(view["tasks"], [])
            self.assertTrue(view["briefing"]["summary"])
