import os
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, select, func
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from Backend.database import Base, get_db
from Backend.main import app
from Backend.routers.workspace import session_factory
from Backend.models.db_models import TaskFactsModel, PriorityRunModel
from Backend.models.auth import SessionModel, CredentialModel
from Backend.models.db_models import utc_now
from datetime import timedelta


class WorkspaceTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
        @event.listens_for(self.engine, 'connect')
        def fk(connection, _):
            connection.execute('PRAGMA foreign_keys=ON')
        Base.metadata.create_all(self.engine)
        self.factory = sessionmaker(self.engine)
        def db():
            with self.factory() as session:
                yield session
        app.dependency_overrides[get_db] = db
        app.dependency_overrides[session_factory] = lambda: self.factory
        self.client = TestClient(app, headers={'X-Axis-Request': '1', 'Origin': 'http://localhost:5173'})
        self.env = patch.dict(os.environ, {'EXPLANATION_MODE': 'rules', 'EXTRACTION_MODE': 'fixture'})
        self.env.start()

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        self.env.stop()
        self.engine.dispose()

    def register(self, email='first@example.com'):
        response = self.client.post('/api/auth/register', json={'email': email, 'password': 'a-long-test-password'})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_mock_import_only_selected_integrations(self):
        self.register()
        response = self.client.post('/api/workspace/sync-mock', json={'integrations': ['canvas']})
        self.assertEqual(response.status_code, 200, response.text)
        view = response.json()
        self.assertTrue(view['tasks'])
        self.assertTrue(all(task['source'] == 'canvas' for task in view['tasks']))
        self.assertEqual(view['calendarEvents'], [])
        calendar = self.client.post('/api/workspace/sync-mock', json={'integrations': ['google_calendar']})
        self.assertEqual(calendar.status_code, 200, calendar.text)
        self.assertTrue(calendar.json()['calendarEvents'])
        self.assertEqual(calendar.json()['importResult']['created'], 0)
        self.assertEqual(len(calendar.json()['tasks']), len(view['tasks']))
        for integrations in ([], ['unsupported']):
            rejected = self.client.post('/api/workspace/sync-mock', json={'integrations': integrations})
            self.assertEqual(rejected.status_code, 422)

    def test_import_edit_replay_reload_complete_and_reopen(self):
        self.register()
        result = self.client.post('/api/workspace/sync-mock')
        self.assertEqual(result.status_code, 200, result.text)
        view = result.json()
        self.assertEqual(len(view['tasks']), 5)
        self.assertEqual(view['status'], 'fallback')
        self.assertTrue(view['briefing']['summary'])
        self.assertEqual(len(view['calendarEvents']), 1)
        self.assertTrue(all(t['reasoning'] and t['explanationSource'] == 'rules' for t in view['tasks']))
        task = view['tasks'][0]
        edit = self.client.patch(f"/api/workspace/tasks/{task['id']}", json={'version': task['version'], 'estimatedHours': 2, 'confirmEvidence': True})
        self.assertEqual(edit.status_code, 200, edit.text)
        updated = next(t for t in edit.json()['tasks'] if t['id'] == task['id'])
        self.assertEqual(updated['estimatedHours'], 2)
        self.assertFalse(updated['requiresReview'])
        stale = self.client.patch(f"/api/workspace/tasks/{task['id']}", json={'version': task['version'], 'estimatedHours': 3})
        self.assertEqual(stale.status_code, 409)
        replay = self.client.post('/api/workspace/sync-mock').json()
        self.assertEqual(replay['importResult']['unchanged'], 5)
        self.assertEqual(next(t for t in replay['tasks'] if t['id'] == task['id'])['version'], 2)
        saved = self.client.get('/api/workspace').json()
        self.assertEqual(saved['runId'], replay['runId'])
        done = self.client.patch(f"/api/workspace/tasks/{task['id']}", json={'version': 2, 'status': 'completed'}).json()
        self.assertNotIn(task['id'], [t['id'] for t in done['tasks']])
        self.assertEqual(done['completedTasks'][0]['id'], task['id'])
        reopened = self.client.patch(f"/api/workspace/tasks/{task['id']}", json={'version': 3, 'status': 'pending'})
        self.assertEqual(len(reopened.json()['tasks']), 5)
        with self.factory() as db:
            self.assertEqual(db.scalar(select(func.count()).select_from(TaskFactsModel)), 8)

    def test_auth_isolation_logout_and_csrf(self):
        self.assertEqual(self.client.get('/api/workspace').status_code, 401)
        self.register('owner@example.com')
        view = self.client.post('/api/workspace/sync-mock').json()
        task = view['tasks'][0]
        self.assertEqual(self.client.post('/api/workspace/refresh', headers={'Origin': 'https://evil.example'}).status_code, 403)
        self.client.post('/api/auth/logout')
        self.assertEqual(self.client.get('/api/workspace').status_code, 401)
        self.register('other@example.com')
        self.assertEqual(self.client.get('/api/workspace').json()['tasks'], [])
        self.assertEqual(self.client.patch(f"/api/workspace/tasks/{task['id']}", json={'version': 1, 'status': 'completed'}).status_code, 404)
        self.client.post('/api/auth/logout')
        login = self.client.post('/api/auth/login', json={'email': 'owner@example.com', 'password': 'a-long-test-password'})
        self.assertEqual(login.status_code, 200)
        self.assertEqual(len(self.client.get('/api/workspace').json()['tasks']), 5)
        self.assertEqual(self.client.get('/api/tasks').status_code, 404)

    def test_provider_failure_preserves_saved_rankings(self):
        self.register('fallback@example.com')
        with patch.dict(os.environ, {'EXPLANATION_MODE': 'gemini'}), patch('Backend.explanations.provider.GeminiExplanationProvider.generate', side_effect=TimeoutError):
            view = self.client.post('/api/workspace/sync-mock').json()
        self.assertEqual(view['status'], 'fallback')
        self.assertEqual([t['rank'] for t in view['tasks']], [1, 2, 3, 4, 5])
        with self.factory() as db:
            run = db.scalar(select(PriorityRunModel))
            self.assertEqual(run.explanation_error, 'TimeoutError')

    def test_session_expiry_password_hash_and_missing_csrf_header(self):
        self.register('expiry@example.com')
        token = self.client.cookies.get('axis_session')
        with self.factory.begin() as db:
            session = db.scalar(select(SessionModel))
            self.assertNotEqual(session.token_hash, token)
            credential = db.scalar(select(CredentialModel))
            self.assertNotEqual(credential.password_hash, 'a-long-test-password')
            session.expires_at = utc_now() - timedelta(seconds=1)
        self.assertEqual(self.client.get('/api/workspace').status_code, 401)
        self.client.headers.pop('X-Axis-Request')
        self.assertEqual(self.client.post('/api/auth/login', json={
            'email': 'expiry@example.com', 'password': 'a-long-test-password'
        }).status_code, 403)

    def test_failed_extraction_is_reported_without_inventing_tasks(self):
        self.register('extraction@example.com')
        with patch.dict(os.environ, {'EXTRACTION_MODE': 'gemini'}), patch(
            'Backend.ingestion.extraction.GeminiExtractor.extract', side_effect=TimeoutError
        ):
            response = self.client.post('/api/workspace/sync-mock')
        self.assertEqual(response.status_code, 200)
        view = response.json()
        self.assertEqual(view['importResult']['mode'], 'gemini')
        self.assertEqual(len(view['importResult']['issues']), 5)
        # Manual structured facts and calendar events remain valid.
        self.assertEqual(len(view['tasks']), 1)
        self.assertEqual(len(view['calendarEvents']), 1)


if __name__ == '__main__':
    unittest.main()
