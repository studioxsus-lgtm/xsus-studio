import unittest
from languages.en.text.context_v6 import analyze_context

class ContextV6Tests(unittest.TestCase):
    def test_empty(self):
        result = analyze_context([])
        self.assertEqual(result.turns, ())
        self.assertEqual(result.latest_intent, "unknown")

    def test_history_and_references(self):
        result = analyze_context(["Write a report.", "Summarize that report."])
        self.assertEqual(len(result.turns), 2)
        self.assertTrue(result.turns[1].references_previous_turn)
        self.assertEqual(result.latest_intent, "summarize")
        self.assertEqual(result.unresolved_references, ())

    def test_first_turn_reference_is_unresolved(self):
        result = analyze_context(["Explain that."])
        self.assertEqual(result.unresolved_references, (0,))

    def test_truncation_and_absolute_indices(self):
        result = analyze_context(["Hello.", "Hello.", "Translate this text."], max_turns=2)
        self.assertTrue(result.truncated)
        self.assertEqual([t.index for t in result.turns], [1, 2])

    def test_reject_invalid_input(self):
        for messages in (None, "hello", [""], ["ok", None]):
            with self.subTest(messages=str(messages)), self.assertRaises(ValueError):
                analyze_context(messages)

    def test_max_turns_validation(self):
        for value in (0, -1, 101, 1.5, True):
            with self.subTest(value=value), self.assertRaises(ValueError):
                analyze_context([], max_turns=value)
