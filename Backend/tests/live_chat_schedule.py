"""Opt-in live Gemini smoke test; all account and schedule writes use in-memory SQLite.

Run with configured Gemini credentials: python -m Backend.tests.live_chat_schedule
"""
import logging
import os

# This check never opens the application database, including on Docker where
# docker_start normally constructs DATABASE_URL only in the server process.
os.environ['DATABASE_URL'] = 'sqlite://'

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from Backend.config import WorkspaceSettings, workspace_settings, chat_settings, auth_settings
from Backend.database import Base
from Backend.dependencies import session_factory
from Backend.main import app


def main():
    assert chat_settings().configured, 'Configure Gemini before running the live smoke test.'
    logging.getLogger().setLevel(logging.WARNING)
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(engine)
    app.dependency_overrides[session_factory] = lambda: factory
    app.dependency_overrides[workspace_settings] = lambda: WorkspaceSettings()
    client = TestClient(app, headers={'X-Axis-Request': '1', 'Origin': auth_settings().origins[0]})
    try:
        response = client.post('/api/auth/register', json={
            'email': 'schedule-smoke@example.com', 'password': 'temporary-smoke-password'})
        assert response.status_code == 200, response.text
        response = client.post('/api/workspace/sync-mock')
        assert response.status_code == 200, response.text
        workspace = response.json()
        exam = next(t for t in workspace['tasks'] if 'CS-401' in t['title'])
        response = client.post('/api/chat', json={
            'message': "can we move CS-401? I don't feel like studying now",
            'tasks': workspace['tasks'], 'runId': workspace['runId']})
        assert response.status_code == 200, response.text
        proposal = response.json().get('proposal')
        assert proposal and proposal['moves'], f'Live Gemini returned no action: {response.text}'
        assert proposal['moves'][0]['taskId'] == exam['id'], proposal
        assert proposal['moves'][0]['toBucket'] == 'next', proposal
        response = client.post('/api/workspace/plan', json=proposal)
        assert response.status_code == 200, response.text
        changed = next(t for t in response.json()['tasks'] if t['id'] == exam['id'])
        assert changed['priorityBucket'] == 'next', changed
        assert changed['plannedWork'] and changed['plannedWork'] != exam['plannedWork'], changed
        assert all(b['start'][:10] > workspace['mockNow'][:10] for b in changed['plannedWork']), changed
        saved = client.get('/api/workspace').json()
        assert next(t for t in saved['tasks'] if t['id'] == exam['id'])['plannedWork'] == changed['plannedWork']
        assert client.post('/api/workspace/plan', json=proposal).status_code == 409
        print('PASS: live Gemini returned the CS-401 move; approval rebuilt and saved focus blocks; stale approval rejected.')
    finally:
        client.close()
        app.dependency_overrides.clear()
        engine.dispose()


if __name__ == '__main__':
    main()
