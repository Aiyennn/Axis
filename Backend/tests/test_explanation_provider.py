import json
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from Backend.explanations.contracts import ExplanationBatch
from Backend.explanations.provider import GeminiExplanationProvider


class GeminiProviderTests(unittest.TestCase):
    def test_supplies_output_contract_in_json_mode_and_validates_response(self):
        batch = ExplanationBatch(briefing={"summary": "Start with the exam."}, taskExplanations=[])
        client = MagicMock()
        client.models.generate_content.return_value = SimpleNamespace(text=batch.model_dump_json())
        with patch.dict("os.environ", {"GEMINI_API_KEY": "test-key", "GEMINI_EXPLANATION_MODEL": "test-model"}):
            with patch("google.genai.Client") as factory:
                factory.return_value.__enter__.return_value = client
                result = GeminiExplanationProvider().generate({"tasks": []})
        config = client.models.generate_content.call_args.kwargs["config"]
        options = factory.call_args.kwargs["http_options"]
        self.assertEqual(options.timeout, 20000)
        self.assertEqual(options.retry_options.attempts, 1)
        self.assertIsNone(config.response_schema)
        self.assertIsNone(config.response_json_schema)
        self.assertEqual(config.response_mime_type, "application/json")
        supplied_schema = config.system_instruction.split("Output JSON Schema:\n", 1)[1]
        self.assertEqual(json.loads(supplied_schema), ExplanationBatch.model_json_schema())
        self.assertIn("exactly one taskExplanations entry per assessmentId", config.system_instruction)
        self.assertEqual(result, batch)
