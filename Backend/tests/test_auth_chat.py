import unittest
import time
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from Backend.database import Base
from Backend.main import app
from Backend.config import AuthSettings, ChatSettings, auth_settings, chat_settings
from Backend.dependencies import session_factory, login_limiter, chat_provider
from Backend.models.auth import CredentialModel, SessionModel
from Backend.models.db_models import UserModel, ChatMessageModel
from Backend.services.auth import LoginLimiter, token_hash
from Backend.services.chat_provider import FALLBACK_MESSAGE, GeminiChatProvider
from Backend.models.schemas import ChatRequest


class AuthChatTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.factory = sessionmaker(self.engine)
        self.limiter = LoginLimiter()
        app.dependency_overrides[session_factory] = lambda: self.factory
        app.dependency_overrides[login_limiter] = lambda: self.limiter
        app.dependency_overrides[chat_settings] = lambda: ChatSettings()
        self.client = TestClient(app, headers={'X-Axis-Request': '1', 'Origin': 'http://localhost:5173'})

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        self.engine.dispose()

    def register(self):
        return self.client.post('/api/auth/register', json={'email': 'User@Example.com', 'password': 'long-password'})

    def test_duplicate_registration_rolls_back_without_setting_cookie(self):
        first = self.register()
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.json()['email'], 'user@example.com')
        rejected = self.register()
        self.assertEqual(rejected.status_code, 409)
        self.assertEqual(rejected.json(), {'detail': 'Account cannot be created with this email'})
        self.assertNotIn('set-cookie', rejected.headers)
        with self.factory() as db:
            for model in (UserModel, CredentialModel, SessionModel):
                self.assertEqual(db.scalar(select(func.count()).select_from(model)), 1)

    def test_login_rotates_session_invalid_login_preserves_it_and_logout_revokes_it(self):
        self.register()
        old = self.client.cookies.get('axis_session')
        invalid = self.client.post('/api/auth/login', json={'email': 'user@example.com', 'password': 'incorrect'})
        self.assertEqual(invalid.status_code, 401)
        self.assertEqual(invalid.json(), {'detail': 'Invalid email or password'})
        self.assertNotIn('set-cookie', invalid.headers)
        login = self.client.post('/api/auth/login', json={'email': 'user@example.com', 'password': 'long-password'})
        self.assertEqual(login.status_code, 200)
        new = self.client.cookies.get('axis_session')
        self.assertNotEqual(old, new)
        with self.factory() as db:
            self.assertIsNone(db.get(SessionModel, token_hash(old)))
            self.assertIsNotNone(db.get(SessionModel, token_hash(new)))
        self.assertEqual(self.client.get('/api/auth/me').json(), login.json())
        self.assertEqual(self.client.post('/api/auth/logout').json(), {'ok': True})
        self.assertEqual(self.client.get('/api/auth/me').status_code, 401)
        with self.factory() as db:
            self.assertIsNone(db.get(SessionModel, token_hash(new)))

    def test_rate_limit_and_origin_errors_keep_http_contract(self):
        self.limiter._attempts['testclient'] = (20, time.monotonic())
        rejected = self.register()
        self.assertEqual(rejected.status_code, 429)
        self.assertEqual(rejected.json(), {'detail': 'Too many attempts. Try again in five minutes.'})
        response = self.client.post('/api/auth/register', headers={'Origin': 'https://evil.example'},
                                    json={'email': 'x@y.com', 'password': 'long-password'})
        self.assertEqual(response.status_code, 403)

    def test_invalid_request_does_not_consume_login_attempt(self):
        with patch.object(self.limiter, 'check') as check:
            response = self.client.post('/api/auth/login', json={'email': 'bad', 'password': 'x'})
        self.assertEqual(response.status_code, 422)
        check.assert_not_called()

    def test_cookie_configuration_is_injected(self):
        app.dependency_overrides[auth_settings] = lambda: AuthSettings(cookie_secure=True)
        response = self.register()
        self.assertEqual(response.status_code, 200)
        cookie = response.headers['set-cookie']
        for flag in ('HttpOnly', 'Secure', 'SameSite=lax', 'Max-Age=604800', 'Path=/'):
            self.assertIn(flag, cookie)

    def test_offline_chat_status_reply_and_history(self):
        status = self.client.get('/api/chat').json()
        self.assertFalse(status['llm_embedded'])
        self.assertIsNone(status['model'])
        response = self.client.post('/api/chat', json={'message': 'What next?', 'tasks': None})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'reply': FALLBACK_MESSAGE, 'engine': 'offline', 'proposal': None})
        history = self.client.get('/api/chat/history').json()
        self.assertEqual([m['sender'] for m in history], ['user', 'assistant'])
        self.assertEqual([m['text'] for m in history], ['What next?', FALLBACK_MESSAGE])

    def enable_provider(self, provider):
        app.dependency_overrides[chat_settings] = lambda: ChatSettings('test-key', 'test-model')
        app.dependency_overrides[chat_provider] = lambda: provider

    def test_provider_runs_after_user_message_commit(self):
        from sqlalchemy import event
        commits = []
        event.listen(self.factory, 'after_commit', lambda session: commits.append(True))
        def generate(request):
            self.assertEqual(len(commits), 1)
            with self.factory() as db:
                self.assertEqual(db.scalar(select(ChatMessageModel.text)), 'Help')
            return 'Do the first task.'
        provider = Mock()
        provider.generate.side_effect = generate
        self.enable_provider(provider)
        response = self.client.post('/api/chat', json={'message': 'Help'})
        self.assertEqual(response.json()['reply'], 'Do the first task.')
        self.assertEqual(response.json()['engine'], 'gemini')
        self.assertEqual(len(commits), 2)

    def test_provider_failure_and_empty_reply_keep_existing_engine_semantics(self):
        provider = Mock()
        self.enable_provider(provider)
        provider.generate.side_effect = TimeoutError('private provider error')
        failed = self.client.post('/api/chat', json={'message': 'Help'}).json()
        self.assertEqual(failed['reply'], FALLBACK_MESSAGE)
        self.assertEqual(failed['engine'], 'offline')
        provider.generate.side_effect = None
        provider.generate.return_value = FALLBACK_MESSAGE
        empty = self.client.post('/api/chat', json={'message': 'Help'}).json()
        self.assertEqual(empty['reply'], FALLBACK_MESSAGE)
        self.assertEqual(empty['engine'], 'gemini')

    def test_message_save_failures_do_not_prevent_reply_or_other_save(self):
        real_begin = self.factory.begin
        for failed_call in (1, 2):
            with self.subTest(failed_call=failed_call):
                count = 0
                def begin():
                    nonlocal count
                    count += 1
                    if count == failed_call:
                        raise RuntimeError('storage unavailable')
                    return real_begin()
                with patch.object(self.factory, 'begin', side_effect=begin):
                    response = self.client.post('/api/chat', json={'message': 'Help'})
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()['reply'], FALLBACK_MESSAGE)
                self.assertEqual(count, 2)
        self.assertEqual(len(self.client.get('/api/chat/history').json()), 2)

    def test_gemini_adapter_does_not_attach_tasks_to_initial_prompt(self):
        with patch('google.genai.Client') as client:
            generate = client.return_value.__enter__.return_value.models.generate_content
            generate.return_value.text = '  Advice  '
            provider = GeminiChatProvider(ChatSettings('key', 'model'))
            reply = provider.generate(ChatRequest(message='Question', tasks=[{'title': f'Task {i}'} for i in range(13)]))
            self.assertEqual(reply, 'Advice')
            kwargs = generate.call_args.kwargs
            self.assertEqual(kwargs['model'], 'model')
            self.assertEqual(kwargs['contents'], 'Question')
            self.assertNotIn('Task 0', kwargs['contents'])
            self.assertNotIn('Task 12', kwargs['contents'])
            self.assertEqual(kwargs['config'].max_output_tokens, 1024)
            self.assertEqual(kwargs['config'].tool_config.function_calling_config.mode, 'AUTO')
            self.assertEqual(kwargs['config'].automatic_function_calling.maximum_remote_calls, 4)

    def test_gemini_schedule_request_requires_structured_action(self):
        with patch('google.genai.Client') as client:
            generate = client.return_value.__enter__.return_value.models.generate_content
            generate.return_value.text = '{"action":"move","moves":[{"taskId":"exam-1","bucket":"next"}],"reply":"Done"}'
            result = GeminiChatProvider(ChatSettings('key', 'model')).generate(ChatRequest(
                message="can we move CS-401? I don't feel like studying now", runId='run-1',
                tasks=[{'id': 'exam-1', 'title': 'CS-401 Midterm Exam Preparation', 'priorityBucket': 'now'}]))
            self.assertTrue(result.proposal.requiresApproval)
            self.assertEqual(result.proposal.runId, 'run-1')
            self.assertEqual(result.proposal.moves[0].toBucket, 'next')
            self.assertNotIn('Done', result.reply)
            self.assertEqual(generate.call_args.kwargs['config'].response_mime_type, 'application/json')
            self.assertIsNone(generate.call_args.kwargs['config'].tools)

    def test_schedule_decision_unknown_task_or_ambiguity_has_no_fake_proposal(self):
        with patch('google.genai.Client') as client:
            generate = client.return_value.__enter__.return_value.models.generate_content
            provider = GeminiChatProvider(ChatSettings('key', 'model'))
            request = ChatRequest(message='Move the exam next', runId='run-1',
                                  tasks=[{'id': 'exam-1', 'title': 'Exam', 'priorityBucket': 'now'}])
            generate.return_value.text = '{"action":"move","moves":[{"taskId":"invented","bucket":"next"}],"reply":"Approve below"}'
            response = provider.generate(request)
            self.assertIsNone(response.proposal)
            self.assertNotIn('Approve below', response.reply)
            generate.return_value.text = '{"action":"clarify","moves":[],"reply":"Which exam?"}'
            response = provider.generate(request)
            self.assertIsNone(response.proposal)
            self.assertEqual(response.reply, 'Which exam?')

    def test_chat_endpoint_keeps_structured_proposal(self):
        from Backend.models.schemas import ChatResponse, PlanChangeProposalSchema
        proposal = PlanChangeProposalSchema(id='plan-1', runId='run-1', requestedPrompt='Move exam next',
            moves=[dict(taskId='exam-1', taskTitle='Exam', fromBucket='now', toBucket='next')], tradeOffs=[])
        provider = Mock()
        provider.generate.return_value = ChatResponse(reply='Review the change below.', proposal=proposal)
        self.enable_provider(provider)
        response = self.client.post('/api/chat', json={'message': 'Move exam next', 'runId': 'run-1'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['proposal'], proposal.model_dump())

    def test_gemini_workspace_tool_supplies_context_only_when_called(self):
        with patch('google.genai.Client') as client:
            generate = client.return_value.__enter__.return_value.models.generate_content
            def request_tasks(**kwargs):
                context = kwargs['config'].tools[0]()
                self.assertIn('Task 11', context)
                self.assertNotIn('Task 12', context)
                self.assertIn('deadline=Friday, effort=2h. Due soon', context)
                return Mock(text='Work on Task 0 first.')
            generate.side_effect = request_tasks
            provider = GeminiChatProvider(ChatSettings('key', 'model'))
            tasks = [{'title': f'Task {i}', 'deadline': 'Friday',
                      'estimatedHours': 2, 'reasoning': 'Due soon'} for i in range(13)]
            reply = provider.generate(ChatRequest(message='What should I work on?', tasks=tasks))
            self.assertEqual(reply, 'Work on Task 0 first.')

    def test_gemini_workspace_tool_handles_empty_workspace(self):
        self.assertEqual(GeminiChatProvider._task_context(None),
                         'No tasks currently loaded in workspace.')
