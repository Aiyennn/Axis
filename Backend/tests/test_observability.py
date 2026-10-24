import asyncio
import io
import logging
import unittest
from threading import Event, enumerate as threads
from time import perf_counter
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from Backend.observability import (
    ReadableFormatter, RequestFilter, log_stage, request_id, request_route, request_started,
)


class ObservabilityTests(unittest.TestCase):
    def setUp(self):
        self.logger = logging.getLogger('observability-test')
        self.stream = io.StringIO()
        self.handler = logging.StreamHandler(self.stream)
        self.handler.addFilter(RequestFilter())
        self.handler.setFormatter(ReadableFormatter())
        self.logger.addHandler(self.handler)
        self.logger.setLevel(logging.INFO)
        self.logger.propagate = False
        self.tokens = [request_id.set('test-request'), request_route.set('POST /api/chat'),
                       request_started.set(perf_counter())]

    def tearDown(self):
        request_id.reset(self.tokens[0])
        request_route.reset(self.tokens[1])
        request_started.reset(self.tokens[2])
        self.logger.removeHandler(self.handler)

    def test_stage_format_and_timing(self):
        with log_stage(self.logger, 'chat.database.save_user'):
            pass
        output = self.stream.getvalue()
        self.assertIn('| START | chat.database.save_user', output)
        self.assertIn('| DONE  | chat.database.save_user', output)
        self.assertIn('req=test-request | POST /api/chat', output)
        self.assertIn('elapsed_s=', output)

    def test_failure_is_logged_without_sensitive_exception_message(self):
        with self.assertRaises(TimeoutError):
            with log_stage(self.logger, 'chat.gemini.generate'):
                raise TimeoutError('secret prompt and API key')
        output = self.stream.getvalue()
        self.assertIn('| FAIL  | chat.gemini.generate', output)
        self.assertIn('error_type=TimeoutError', output)
        self.assertNotIn('secret', output)
        self.assertNotIn('| DONE ', output)

    def test_wait_retains_request_context_and_stops_after_stage(self):
        waited = Event()
        original_emit = self.handler.emit
        def capture(record):
            original_emit(record)
            if getattr(record, 'stage_state', None) == 'WAIT':
                waited.set()
        self.handler.emit = capture
        with log_stage(self.logger, 'chat.gemini.generate', wait_seconds=0.01):
            self.assertTrue(waited.wait(1), 'No wait log was emitted')
        lines = self.stream.getvalue().splitlines()
        waiting = [line for line in lines if '| WAIT ' in line]
        self.assertTrue(waiting)
        self.assertTrue(all('req=test-request | POST /api/chat' in line for line in waiting))
        self.assertIn('| DONE ', lines[-1])
        self.assertFalse(any(thread.name == 'request-log-wait' for thread in threads()))

    def test_legacy_events_are_readable_and_single_line(self):
        self.logger.info('workspace.generation.completed run_id=123\nforged line')
        output = self.stream.getvalue()
        self.assertIn('| DONE  | workspace.generation.completed | run_id=123\\nforged line', output)
        self.assertEqual(len(output.splitlines()), 1)

    def test_provider_timing_excludes_database_saves(self):
        from Backend.services.chat import ChatService
        from Backend.config import ChatSettings
        provider = MagicMock()
        provider.generate.return_value = 'Hello'
        service = ChatService(MagicMock(), ChatSettings('key', 'model'), provider)
        with self.assertLogs('Backend.services.chat', level='INFO') as captured:
            with patch('Backend.services.chat.perf_counter', side_effect=[10, 100, 100.25, 101]):
                response = service.post(SimpleNamespace(message='Hi', tasks=[]))
        self.assertEqual(response.reply, 'Hello')
        output = '\n'.join(captured.output)
        self.assertIn('duration_ms=250', output)
        self.assertIn('duration_ms=91000', output)
        for stage in ('chat.database.save_user', 'chat.gemini.generate', 'chat.database.save_assistant'):
            states = [record.stage_state for record in captured.records
                      if getattr(record, 'stage_name', None) == stage]
            self.assertEqual(states, ['START', 'DONE'])

    def test_request_context_reaches_worker_and_is_reset(self):
        from Backend.main import log_requests
        from starlette.responses import Response
        from starlette.concurrency import run_in_threadpool
        async def exercise():
            previous_id = request_id.get()
            async def next_handler(request):
                observed = await run_in_threadpool(lambda: (request_id.get(), request_route.get()))
                self.assertNotEqual(observed[0], previous_id)
                self.assertEqual(observed[1], 'POST /api/chat')
                return Response()
            request = SimpleNamespace(method='POST', url=SimpleNamespace(path='/api/chat'))
            response = await log_requests(request, next_handler)
            self.assertIn('X-Request-ID', response.headers)
            self.assertEqual(request_id.get(), previous_id)
            self.assertEqual(request_route.get(), 'POST /api/chat')
        asyncio.run(exercise())
