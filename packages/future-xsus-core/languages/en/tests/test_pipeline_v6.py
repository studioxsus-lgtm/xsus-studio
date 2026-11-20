import unittest
from languages.en.text.pipeline_v6 import analyze_request

class PipelineV6Tests(unittest.TestCase):
    def test_combines_signals(self):
        result = analyze_request("Please summarize this report.", ["The report is ready."])
        self.assertEqual(result.intent.intent, "summarize")
        self.assertEqual(result.semantic.sentence_type, "statement")
        self.assertEqual(len(result.context.turns), 2)
        self.assertEqual(result.context.latest_intent, "summarize")

    def test_question(self):
        result = analyze_request("Why is it late?")
        self.assertEqual(result.intent.intent, "question")
        self.assertEqual(result.semantic.question_word, "why")

    def test_rejects_history_type(self):
        with self.assertRaises(ValueError):
            analyze_request("Hello.", history="not a list")
