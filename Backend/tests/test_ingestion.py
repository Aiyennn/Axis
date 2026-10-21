import asyncio
import copy
import unittest
from unittest.mock import patch

import httpx
from fastapi import FastAPI
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session

from Backend.database import Base
from Backend.models.db_models import UserModel, TaskFactsModel, CalendarSourceModel
from Backend.integrations.adapters import adapt
from Backend.ingestion.extraction import FixtureExtractor, GeminiExtractor
from Backend.ingestion.pipeline import load_fixtures, preview_import
from Backend.ingestion.store import persist_import
from Backend.ingestion.validation import normalize
from Backend.routers.integrations import router


class IngestionTests(unittest.TestCase):
    def test_all_sources_and_unknowns(self):
        result = preview_import(user_id="u1")
        self.assertEqual(result.issues, [])
        self.assertEqual(result.processedRecords, 7)
        self.assertEqual(result.ignoredRecords, 1)
        self.assertEqual(len(result.tasks), 5)
        self.assertEqual(len(result.calendarEvents), 1)
        gmail = next(t for t in result.tasks if t.source.integration == "gmail")
        self.assertEqual(gmail.deadlineAt.isoformat(), "2026-10-21T12:00:00+08:00")
        self.assertEqual(gmail.estimatedHours, 2.0)   # fixture now includes effort estimate
        self.assertTrue(gmail.isHardDeadline)          # fixture now includes deadline strictness
        self.assertTrue(gmail.requiresReview)          # extracted fields still require confirmation
        github = next(t for t in result.tasks if t.source.integration == "github")
        self.assertIsNone(github.deadlineAt)  # A milestone isn't a task deadline.

    def test_relative_deadline_uses_message_time_not_fetch_time(self):
        fixtures = load_fixtures()[:1]
        fixtures[0]["fetchedAt"] = "2026-11-20T08:00:00+08:00"
        result = preview_import(fixtures, user_id="u1")
        self.assertEqual(result.tasks[0].deadlineAt.day, 21)
        self.assertEqual(result.tasks[0].deadlineAt.month, 10)

    def test_rejects_fabricated_evidence(self):
        extractor = FixtureExtractor()
        extractor.outputs["gmail:email-hero"]["tasks"][0]["evidence"][0]["quote"] = "Nonexistent quote"
        result = preview_import(load_fixtures()[:1], user_id="u1", extractor=extractor)
        self.assertEqual(result.tasks, [])
        self.assertEqual(result.issues[0]["code"], "RECORD_REJECTED")

    def test_provider_failure_is_explicit_and_other_records_survive(self):
        class Broken:
            mode = "gemini"
            def extract(self, record):
                raise TimeoutError("private provider detail")
        result = preview_import(user_id="u1", extractor=Broken())
        self.assertEqual(len(result.tasks), 1)  # Manual task doesn't need extraction.
        self.assertEqual(len(result.issues), 5)
        self.assertNotIn("private provider detail", result.model_dump_json())
        self.assertEqual(len(result.calendarEvents), 1)

    def test_structured_deadline_cannot_be_overwritten(self):
        envelope = load_fixtures()[2]
        envelope["payload"]["blocks"][0]["paragraph"]["rich_text"][0]["plain_text"] += " noon tomorrow"
        record = adapt(envelope)
        extraction = FixtureExtractor().extract(record)
        extraction.tasks[0].deadlineExpression = "noon tomorrow"
        from Backend.ingestion.extraction import Quote
        extraction.tasks[0].evidence.append(Quote(field="deadlineExpression", quote="noon tomorrow"))
        tasks, _ = normalize(record, extraction, user_id="u1", timezone="Asia/Shanghai")
        self.assertIsNone(tasks[0].deadlineAt)
        self.assertEqual(tasks[0].deadlineDate.isoformat(), "2026-10-23")
        self.assertEqual(next(e for e in tasks[0].evidence if e.field == "deadlineDate").origin, "mapped")

    def test_multiple_tasks_duplicate_keys_and_unsupported_date(self):
        record = adapt(load_fixtures()[0])
        extraction = FixtureExtractor().extract(record)
        second = copy.deepcopy(extraction.tasks[0])
        second.itemKey = "another-action"
        extraction.tasks.append(second)
        tasks, _ = normalize(record, extraction, user_id="u1", timezone="Asia/Shanghai")
        self.assertEqual(len({t.id for t in tasks}), 2)
        extraction.tasks[1].itemKey = extraction.tasks[0].itemKey
        with self.assertRaises(ValueError):
            normalize(record, extraction, user_id="u1", timezone="Asia/Shanghai")
        record.bodyText += " Finish whenever convenient."
        extraction.tasks = extraction.tasks[:1]
        extraction.tasks[0].deadlineExpression = "whenever convenient"
        next(e for e in extraction.tasks[0].evidence if e.field == "deadlineExpression").quote = "Finish whenever convenient."
        tasks, issues = normalize(record, extraction, user_id="u1", timezone="Asia/Shanghai")
        self.assertIsNone(tasks[0].deadlineAt)
        self.assertEqual(issues[0]["code"], "UNRESOLVED_DEADLINE")

    def test_persistence_replays_versions_and_owner_scope(self):
        engine = create_engine("sqlite://")
        @event.listens_for(engine, "connect")
        def enable_fk(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")
        Base.metadata.create_all(engine)
        with Session(engine) as db:
            db.add_all([UserModel(id="u1"), UserModel(id="u2")])
            db.flush()
            result = preview_import(user_id="u1")
            self.assertEqual(persist_import(db, user_id="u1", preview=result)["created"], 5)
            db.commit()
            repeat = preview_import(user_id="u1")
            self.assertEqual(persist_import(db, user_id="u1", preview=repeat)["unchanged"], 5)
            self.assertEqual(db.query(TaskFactsModel).count(), 5)
            self.assertEqual(db.query(CalendarSourceModel).count(), 1)
            with self.assertRaises(ValueError):
                persist_import(db, user_id="u2", preview=result)
            other = preview_import(user_id="u2")
            self.assertEqual(persist_import(db, user_id="u2", preview=other)["created"], 5)
            fixtures = load_fixtures()
            fixtures[-1]["payload"]["estimatedHours"] = 1.0
            changed = preview_import(fixtures, user_id="u1")
            self.assertEqual(persist_import(db, user_id="u1", preview=changed)["revised"], 1)
            self.assertEqual(db.query(TaskFactsModel).count(), 11)
            db.commit()
        engine.dispose()

    def test_fetch_time_change_is_not_a_new_task_revision(self):
        a = preview_import(user_id="u1")
        fixtures = load_fixtures()
        for fixture in fixtures:
            fixture["fetchedAt"] = "2026-10-25T08:00:00+08:00"
        b = preview_import(fixtures, user_id="u1")
        self.assertEqual([t.id for t in a.tasks], [t.id for t in b.tasks])
        self.assertEqual(a.snapshots, b.snapshots)

    def test_mock_endpoint_does_not_expose_raw_snapshots(self):
        app = FastAPI()
        app.include_router(router)
        async def check():
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app), base_url="http://test") as client:
                response = await client.post("/api/integrations/mock/preview")
                self.assertEqual(response.status_code, 200)
                body = response.json()
                self.assertEqual(body["extractionMode"], "fixture")
                self.assertNotIn("snapshots", body)
                self.assertNotIn("ownerId", body)
                self.assertEqual(len(body["tasks"]), 5)
        asyncio.run(check())

    def test_gemini_configuration_error_does_not_fake_ai_output(self):
        with patch.dict("os.environ", {"GEMINI_API_KEY": "", "GEMINI_MODEL": ""}):
            with self.assertRaises(ValueError):
                GeminiExtractor().extract(adapt(load_fixtures()[0]))


if __name__ == "__main__":
    unittest.main()
