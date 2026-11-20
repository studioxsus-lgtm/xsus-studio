import json
import unittest
from languages.en.text.analysis_api_v6 import analyze_text_v6

class AnalysisApiV6Tests(unittest.TestCase):
    def test_serializable_result(self):
        result = analyze_text_v6("Why is the report late?")
        json.dumps(result)
        self.assertEqual(result["contract_version"], "6.0.0-experimental")
        self.assertEqual(result["language"], "en")
        self.assertEqual(result["intent"]["intent"], "question")
        self.assertEqual(result["semantic"]["question_word"], "why")

    def test_context_and_clarification(self):
        result = analyze_text_v6("Explain that.", ["The delivery is delayed."])
        self.assertEqual(len(result["context"]["turns"]), 2)
        self.assertFalse(result["clarification"]["needed"])

    def test_explicit_limits(self):
        result = analyze_text_v6("Summarize this report.")
        self.assertFalse(result["capabilities"]["generates_response"])
        self.assertFalse(result["capabilities"]["verifies_facts"])

    def test_no_mutation(self):
        history = ["The report is ready."]
        analyze_text_v6("Explain that.", history)
        self.assertEqual(history, ["The report is ready."])

    def test_invalid_history(self):
        for value in ("bad", None, 5):
            with self.subTest(value=value), self.assertRaises(ValueError):
                analyze_text_v6("Explain this.", value)

    def test_invalid_text(self):
        for value in ("", "a" * 10001, None):
            with self.subTest(value=str(value)[:8]), self.assertRaises(ValueError):
                analyze_text_v6(value)

    def test_deterministic_serialization(self):
        first = analyze_text_v6("Please rewrite this paragraph.")
        second = analyze_text_v6("Please rewrite this paragraph.")
        self.assertEqual(json.dumps(first, sort_keys=True), json.dumps(second, sort_keys=True))
