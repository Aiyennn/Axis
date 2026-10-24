import os
import unittest
from Backend.tests.fixtures import fixtures_with_calendar
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, select, func
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from Backend.database import Base, get_db
from Backend.main import app
from Backend.dependencies import session_factory, login_limiter
from Backend.services.auth import LoginLimiter
from Backend.config import WorkspaceSettings, workspace_settings
from Backend.models.db_models import TaskFactsModel, PriorityRunModel
from Backend.models.auth import SessionModel, CredentialModel
from Backend.models.db_models import utc_now
from datetime import timedelta


class WorkspaceTests(unittest.TestCase):
    def setUp(self):
        for target in ('Backend.ingestion.pipeline.load_fixtures', 'Backend.services.workspace.load_fixtures'):
            fixture_patch = patch(target, side_effect=fixtures_with_calendar)
            fixture_patch.start()
            self.addCleanup(fixture_patch.stop)
        self.engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
        @event.listens_for(self.engine, 'connect')
        def fk(connection, _):
            connection.execute('PRAGMA foreign_keys=ON')
        Base.metadata.create_all(self.engine)
        self.factory = sessionmaker(self.engine)
        def db():
            with self.factory() as session:
                yield session
        limiter = LoginLimiter()
        app.dependency_overrides[login_limiter] = lambda: limiter
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

    def test_settings_dependency_overrides_provider_selection(self):
        self.register()
        app.dependency_overrides[workspace_settings] = lambda: WorkspaceSettings()
        with patch.dict(os.environ, {'EXPLANATION_MODE': 'gemini', 'EXTRACTION_MODE': 'gemini'}), patch(
            'Backend.services.workspace.GeminiExtractor'
        ) as extractor:
            response = self.client.post('/api/workspace/sync-mock')
            extractor.assert_not_called()
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json()['importResult']['mode'], 'fixture')
            self.assertEqual(response.json()['status'], 'fallback')
            self.assertEqual(self.client.post('/api/workspace/briefing/retry').status_code, 503)

    def test_import_ranking_failure_rolls_back_tasks_and_calendar(self):
        self.register()
        with patch('Backend.services.workspace.rank_workspace', side_effect=RuntimeError('ranking failed')):
            with self.assertRaisesRegex(RuntimeError, 'ranking failed'):
                self.client.post('/api/workspace/sync-mock')
        saved = self.client.get('/api/workspace').json()
        self.assertEqual(saved['status'], 'empty')
        self.assertEqual(saved['calendarEvents'], [])
        with self.factory() as db:
            self.assertEqual(db.scalar(select(func.count()).select_from(TaskFactsModel)), 0)
            self.assertEqual(db.scalar(select(func.count()).select_from(PriorityRunModel)), 0)

    def test_generation_starts_after_ranking_commit(self):
        self.register()
        from Backend.services.workspace import finish_run
        commits = []
        def committed(session):
            commits.append(True)
        event.listen(self.factory, 'after_commit', committed)
        self.addCleanup(event.remove, self.factory, 'after_commit', committed)
        def after_commit(factory, user_id, run_id, **kwargs):
            self.assertTrue(commits, 'Ranking must commit before generation starts')
            with factory() as db:
                run = db.get(PriorityRunModel, (user_id, run_id))
                self.assertIsNotNone(run)
                self.assertEqual(db.scalar(select(func.count()).select_from(TaskFactsModel)), 5)
            return finish_run(factory, user_id, run_id, **kwargs)
        with patch('Backend.services.workspace.finish_run', side_effect=after_commit) as finish:
            response = self.client.post('/api/workspace/sync-mock')
        self.assertEqual(response.status_code, 200, response.text)
        finish.assert_called_once()

    def test_ranking_failure_rolls_back_revision_and_skips_generation(self):
        self.register()
        original = self.client.post('/api/workspace/sync-mock').json()
        task = original['tasks'][0]
        with patch('Backend.services.workspace.rank_workspace', side_effect=RuntimeError('ranking failed')), patch(
            'Backend.services.workspace.finish_run'
        ) as finish:
            with self.assertRaisesRegex(RuntimeError, 'ranking failed'):
                self.client.patch(f"/api/workspace/tasks/{task['id']}", json={
                    'version': task['version'], 'estimatedHours': 9,
                })
            finish.assert_not_called()
        saved = self.client.get('/api/workspace').json()
        self.assertEqual(saved, {k: v for k, v in original.items() if k != 'importResult'})
        with self.factory() as db:
            self.assertEqual(db.scalar(select(func.max(TaskFactsModel.version)).where(
                TaskFactsModel.id == task['id'])), task['version'])

    def test_null_status_rejected_and_evidence_history_preserved(self):
        self.register()
        original = self.client.post('/api/workspace/sync-mock').json()
        task = original['tasks'][0]
        rejected = self.client.patch(f"/api/workspace/tasks/{task['id']}", json={
            'version': task['version'], 'status': None,
        })
        self.assertEqual(rejected.status_code, 422)
        self.assertEqual(rejected.json(), {'detail': 'Status cannot be null'})
        response = self.client.patch(f"/api/workspace/tasks/{task['id']}", json={
            'version': task['version'], 'estimatedHours': None, 'importance': None,
        })
        self.assertEqual(response.status_code, 200, response.text)
        with self.factory() as db:
            old = db.scalar(
                select(TaskFactsModel).where(TaskFactsModel.id == task['id'], TaskFactsModel.version == task['version']))
            new = db.scalar(select(TaskFactsModel).where(
                TaskFactsModel.id == task['id'], TaskFactsModel.version == task['version'] + 1))
            self.assertEqual(old.evidence, task['evidence'])
            self.assertIsNone(new.estimated_hours)
            self.assertIsNone(new.importance)
            for field in ('estimatedHours', 'importance'):
                self.assertEqual([e for e in new.evidence if e['field'] == field],
                                 [dict(field=field, origin='user', needsConfirmation=False)])

    def test_rejected_calendar_snapshot_preserves_stored_events(self):
        self.register()
        original = self.client.post('/api/workspace/sync-mock').json()
        rejected = [{'integration': 'google_calendar', 'payload': {'id': 'bad'}}]
        with patch('Backend.services.workspace.load_fixtures', return_value=rejected):
            response = self.client.post('/api/workspace/sync-mock', json={
                'integrations': ['google_calendar'],
            })
        self.assertEqual(response.status_code, 200, response.text)
        self.assertTrue(response.json()['importResult']['issues'])
        self.assertEqual(response.json()['calendarEvents'], original['calendarEvents'])

    def test_reset_restores_fixtures_and_replaces_selected_feeds(self):
        self.register()
        original = self.client.post('/api/workspace/sync-mock').json()
        task = next(t for t in original['tasks'] if t['source'] == 'canvas')
        response = self.client.patch(f"/api/workspace/tasks/{task['id']}", json={
            'version': task['version'], 'status': 'completed', 'estimatedHours': 99,
        })
        self.assertEqual(response.status_code, 200, response.text)
        replay = self.client.post('/api/workspace/sync-mock').json()
        self.assertIn(task['id'], [t['id'] for t in replay['completedTasks']])
        response = self.client.post('/api/workspace/sync-mock', json={
            'integrations': ['canvas'], 'reset': True,
        })
        self.assertEqual(response.status_code, 200, response.text)
        reset = response.json()
        restored = next(t for t in reset['tasks'] if t['id'] == task['id'])
        self.assertEqual(restored['estimatedHours'], task['estimatedHours'])
        self.assertGreater(restored['version'], task['version'])
        self.assertEqual(reset['completedTasks'], [])
        self.assertEqual(reset['calendarEvents'], [])
        self.assertTrue(all(t['source'] == 'canvas' for t in reset['tasks']))

    def test_calendar_sync_removes_events_missing_from_latest_snapshot(self):
        self.register()
        original = self.client.post('/api/workspace/sync-mock').json()
        self.assertTrue(original['calendarEvents'])
        from Backend.ingestion.pipeline import load_fixtures
        without_calendar = [e for e in load_fixtures() if e['integration'] != 'google_calendar']
        with patch('Backend.services.workspace.load_fixtures', return_value=without_calendar):
            # Syncing another feed must not erase calendar data.
            partial = self.client.post('/api/workspace/sync-mock', json={'integrations': ['canvas']})
            self.assertEqual(partial.json()['calendarEvents'], original['calendarEvents'])
            synced = self.client.post('/api/workspace/sync-mock', json={
                'integrations': ['google_calendar'],
            })
        self.assertEqual(synced.status_code, 200, synced.text)
        self.assertEqual(synced.json()['calendarEvents'], [])
        self.assertEqual(self.client.post('/api/workspace/refresh').json()['calendarEvents'], [])
        self.assertEqual(self.client.get('/api/workspace').json()['calendarEvents'], [])
        self.assertEqual({t['id'] for t in synced.json()['tasks']},
                         {t['id'] for t in original['tasks']})

    def test_request_logs_correlate_route_service_and_fallback(self):
        self.register()
        with self.assertLogs('Backend', level='INFO') as captured:
            response = self.client.post('/api/workspace/sync-mock')
        self.assertEqual(response.status_code, 200)
        request_id = response.headers['X-Request-ID']
        messages = '\n'.join(captured.output)
        for event in ('request.received', 'workspace.sync.started',
                      'workspace.generation.started', 'explanation.fallback',
                      'explanation.saved', 'request.completed'):
            self.assertIn(event, messages)
        # The context reaches synchronous route/service workers as well as middleware.
        from Backend.observability import RequestFilter
        # Filters run at emission time; attach one while capturing a second request.
        with self.assertLogs('Backend', level='INFO') as correlated:
            import logging
            handler = logging.getLogger('Backend').handlers[0]
            handler.addFilter(RequestFilter())
            loaded = self.client.get('/api/workspace')
        self.assertTrue(all(record.request_id == loaded.headers['X-Request-ID'] for record in correlated.records))
        self.assertNotEqual(request_id, loaded.headers['X-Request-ID'])

    def test_retry_briefing_regenerates_saved_fallback_without_reranking(self):
        self.register()
        original = self.client.post('/api/workspace/sync-mock').json()
        self.assertEqual(original['status'], 'fallback')
        from Backend.explanations.fallback import fallback_batch
        def generate(snapshot):
            batch = fallback_batch(snapshot)
            batch.briefing.summary = 'Start with your exam preparation today.'
            return batch
        with patch.dict(os.environ, {'EXPLANATION_MODE': 'gemini'}):
            with patch('Backend.explanations.service.GeminiExplanationProvider') as provider:
                provider.return_value.model = 'test-model'
                provider.return_value.generate.side_effect = generate
                response = self.client.post('/api/workspace/briefing/retry')
                self.assertEqual(response.status_code, 200, response.text)
                provider.return_value.generate.assert_called_once()
        updated = response.json()
        self.assertEqual(updated['status'], 'ready')
        self.assertEqual(updated['runId'], original['runId'])
        self.assertEqual(updated['briefing']['summary'], 'Start with your exam preparation today.')
        self.assertEqual([(t['id'], t['rank'], t['priorityScore']) for t in original['tasks']],
                         [(t['id'], t['rank'], t['priorityScore']) for t in updated['tasks']])
        self.assertEqual(self.client.get('/api/workspace').json()['briefing'], updated['briefing'])

    def test_retry_reports_disabled_empty_and_provider_failure(self):
        self.assertEqual(self.client.post('/api/workspace/briefing/retry').status_code, 401)
        self.register()
        self.assertEqual(self.client.post('/api/workspace/briefing/retry').status_code, 503)
        with patch.dict(os.environ, {'EXPLANATION_MODE': 'gemini'}):
            self.assertEqual(self.client.post('/api/workspace/briefing/retry').status_code, 409)
        self.client.post('/api/workspace/sync-mock')
        with patch.dict(os.environ, {'EXPLANATION_MODE': 'gemini'}):
            with patch('Backend.explanations.service.GeminiExplanationProvider') as provider:
                provider.return_value.generate.side_effect = TimeoutError('test failure')
                response = self.client.post('/api/workspace/briefing/retry')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'fallback')

    def test_retry_recovers_generation_interrupted_by_restart(self):
        self.register()
        original = self.client.post('/api/workspace/sync-mock').json()
        with self.factory.begin() as db:
            run = db.scalars(select(PriorityRunModel).where(PriorityRunModel.id == original['runId'])).one()
            run.explanation_status = 'generating'
            run.explanation_attempt = 'interrupted-request'
        loaded = self.client.get('/api/workspace').json()
        self.assertTrue(loaded['briefing']['summary'])
        self.assertFalse(loaded['aiBriefingsEnabled'])
        from Backend.explanations.fallback import fallback_batch
        with patch.dict(os.environ, {'EXPLANATION_MODE': 'gemini'}):
            with patch('Backend.explanations.service.GeminiExplanationProvider') as provider:
                provider.return_value.model = 'test-model'
                provider.return_value.generate.side_effect = fallback_batch
                response = self.client.post('/api/workspace/briefing/retry')
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()['status'], 'ready')
        self.assertTrue(response.json()['aiBriefingsEnabled'])
        self.assertEqual(response.json()['runId'], original['runId'])
        provider.return_value.generate.assert_called_once()

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
