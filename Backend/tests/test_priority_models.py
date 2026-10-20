"""Persistence checks use disposable SQLite; no live database is accessed."""
import unittest

from sqlalchemy import create_engine, event
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.schema import CreateTable
from sqlalchemy.dialects import postgresql

from Backend.database import Base
from Backend.models.db_models import TaskFactsModel, PriorityAssessmentModel, PriorityRunModel, UserModel


class PriorityModelsTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        @event.listens_for(self.engine, "connect")
        def enable_foreign_keys(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.db.add_all([UserModel(id="user-1"), UserModel(id="user-2")])
        self.db.commit()
        for user_id, run_id, generation in [("user-1", "run-1", 1), ("user-1", "run-2", 2), ("user-2", "run-1", 1)]:
            self.db.add(PriorityRunModel(user_id=user_id, id=run_id, generation=generation,
                                        context_snapshot={}, engine_version="2", policy_version="slack-v2"))
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def facts(self, version=1, user_id="user-1"):
        return TaskFactsModel.from_normalized({
            "id": "task-1",
            "source": {"integration": "gmail", "accountId": "account-1",
                       "sourceId": "message-1", "sourceItemKey": "item-1"},
            "title": "Revise hero", "deadlineDate": "2026-10-21",
            "evidence": [{"field": "deadlineDate", "origin": "extracted",
                          "sourceField": "bodyText", "quote": "by tomorrow"}],
            "ingestedAt": "2026-10-20T08:00:00+08:00",
        }, user_id=user_id, version=version, source_snapshot={"bodyText": "Revise hero by tomorrow"})

    def assessment(self, **overrides):
        values = dict(user_id="user-1", run_id="run-1", task_id="task-1", task_version=1,
                      engine_version="1", policy_version="1", rank=1,
                      priority_score=75, priority_bucket="next", tier="time_sensitive",
                      decision_facts=[{"code": "DUE_TOMORROW"}],
                      context_snapshot={"timezone": "Asia/Shanghai"})
        values.update(overrides)
        return PriorityAssessmentModel(**values)

    def test_round_trip_preserves_facts_and_pending_explanation(self):
        self.db.add(self.facts())
        self.db.flush()
        row = self.assessment()
        self.db.add(row)
        self.db.commit()
        self.db.expire_all()
        stored = self.db.get(PriorityAssessmentModel, row.id)
        self.assertIsNone(stored.task_facts.estimated_hours)
        self.assertIsNone(stored.task_facts.is_hard_deadline)
        self.assertEqual(stored.task_facts.evidence[0]["quote"], "by tomorrow")
        self.assertEqual(stored.task_facts.source_snapshot["bodyText"], "Revise hero by tomorrow")
        self.assertEqual(stored.explanation_status, "pending")
        self.assertIsNone(stored.explanation)

    def test_history_links_to_exact_version(self):
        first, second = self.facts(), self.facts(version=2)
        second.title = "Updated hero scope"
        self.db.add_all([first, second])
        self.db.flush()
        old, new = self.assessment(), self.assessment(run_id="run-2", task_version=2)
        self.db.add_all([old, new])
        self.db.commit()
        self.assertEqual(old.task_facts.title, "Revise hero")
        self.assertEqual(new.task_facts.title, "Updated hero scope")

    def test_database_rejects_invalid_assessments(self):
        self.db.add(self.facts())
        self.db.commit()
        for invalid in [{"task_version": 99}, {"priority_score": 101},
                        {"rank": 0}, {"priority_bucket": "invalid"},
                        {"explanation_status": "ready"}]:
            with self.subTest(invalid=invalid):
                self.db.add(self.assessment(**invalid))
                with self.assertRaises(IntegrityError):
                    self.db.commit()
                self.db.rollback()

    def test_run_cannot_assess_same_task_twice(self):
        self.db.add(self.facts())
        self.db.flush()
        self.db.add(self.assessment())
        self.db.commit()
        self.db.add(self.assessment(rank=2))
        with self.assertRaises(IntegrityError):
            self.db.commit()

    def test_postgresql_ddl_compiles(self):
        for model in (UserModel, TaskFactsModel, PriorityAssessmentModel):
            ddl = str(CreateTable(model.__table__).compile(dialect=postgresql.dialect()))
            self.assertIn("TIMESTAMP WITH TIME ZONE", ddl)

    def test_users_can_have_same_task_and_run_identifiers(self):
        self.db.add_all([self.facts(), self.facts(user_id="user-2")])
        self.db.flush()
        first = self.assessment()
        second = self.assessment(user_id="user-2")
        self.db.add_all([first, second])
        self.db.commit()
        self.assertEqual(first.task_facts.user.id, "user-1")
        self.assertEqual(second.task_facts.user.id, "user-2")

    def test_assessment_cannot_reference_another_users_task(self):
        self.db.add(self.facts())
        self.db.commit()
        self.db.add(self.assessment(user_id="user-2"))
        with self.assertRaises(IntegrityError):
            self.db.commit()

    def test_task_requires_existing_owner(self):
        self.db.add(self.facts(user_id="missing-user"))
        with self.assertRaises(IntegrityError):
            self.db.commit()

    def test_auth_identity_is_optional_but_unique_when_present(self):
        self.db.add(UserModel(id="user-3", auth_provider="provider", auth_subject="subject-1"))
        self.db.commit()
        self.db.add(UserModel(id="user-4", auth_provider="provider", auth_subject="subject-1"))
        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()
        self.db.add(UserModel(id="user-5", auth_provider="provider"))
        with self.assertRaises(IntegrityError):
            self.db.commit()


if __name__ == "__main__":
    unittest.main()
