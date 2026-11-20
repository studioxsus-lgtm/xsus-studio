import unittest
from languages.en.text.intent_v6 import classify_intent

class IntentV6Tests(unittest.TestCase):
    def test_supported_commands(self):
        for text, expected in (
            ("Summarize this paragraph", "summarize"),
            ("Please translate this sentence", "translate"),
            ("Rewrite this email", "rewrite"),
            ("Rephrase the request", "rewrite"),
            ("Proofread my document", "proofread"),
            ("Correct the grammar in this text", "proofread"),
            ("Explain the process", "explain"),
            ("Clarify the deadline", "clarify"),
        ):
            with self.subTest(text=text):
                result = classify_intent(text)
                self.assertEqual(result.intent, expected)
                self.assertEqual(result.confidence, "high")
                self.assertFalse(result.requires_clarification)

    def test_missing_object_requires_clarification(self):
        for text in ("Translate", "Please summarize!", "Explain:"):
            with self.subTest(text=text):
                self.assertTrue(classify_intent(text).requires_clarification)

    def test_questions_are_not_automatically_commands(self):
        result = classify_intent("Where is the report?")
        self.assertEqual(result.intent, "question")
        self.assertFalse(result.requires_clarification)

    def test_unknown_is_not_fabricated(self):
        result = classify_intent("The report is ready.")
        self.assertEqual(result.intent, "unknown")
        self.assertEqual(result.confidence, "low")

    def test_rejects_invalid_input(self):
        for text in ("", None, "a" * 10001):
            with self.subTest(text=str(text)[:10]), self.assertRaises(ValueError):
                classify_intent(text)
