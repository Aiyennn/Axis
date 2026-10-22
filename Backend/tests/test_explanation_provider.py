import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from Backend.explanations.contracts import ExplanationBatch
from Backend.explanations.provider import GeminiExplanationProvider


class GeminiProviderTests(unittest.TestCase):
    def test_sends_json_schema_and_validates_response(self):
        batch = ExplanationBatch(briefing={"summary": "Start with the exam."}, taskExplanations=[])
        client = MagicMock()
        client.models.generate_content.return_value = SimpleNamespace(text=batch.model_dump_json())
        with patch.dict("os.environ", {"GEMINI_API_KEY": "test-key", "GEMINI_EXPLANATION_MODEL": "test-model"}):
            with patch("google.genai.Client") as factory:
                factory.return_value.__enter__.return_value = client
                result = GeminiExplanationProvider().generate({"tasks": []})
        config = client.models.generate_content.call_args.kwargs["config"]
        self.assertIsNone(config.response_schema)
        self.assertEqual(config.response_json_schema, ExplanationBatch.model_json_schema())
        self.assertEqual(result, batch)
