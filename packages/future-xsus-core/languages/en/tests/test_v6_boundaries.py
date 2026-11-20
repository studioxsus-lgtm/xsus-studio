"""Cross-component V6 regression tests for bounded, deterministic behavior."""
import unittest

from languages.en.text.semantic_signals import analyze_semantic_signals
from languages.en.text.intent_v6 import classify_intent
from languages.en.text.context_v6 import analyze_context
from languages.en.text.pipeline_v6 import analyze_request
from languages.en.text.clarification_v6 import assess_clarification
from languages.en.text.structure_v6 import analyze_structure
from languages.en.text.quality_v6 import check_response_quality


class V6BoundaryTests(unittest.TestCase):
    def test_maximum_accepted_text_length(self):
        text = "a" * 10000
        self.assertEqual(len(analyze_semantic_signals(text).text), 10000)

    def test_oversized_text_rejected_by_all_entrypoints(self):
        text = "a" * 10001
        operations = (
            lambda: analyze_semantic_signals(text),
            lambda: classify_intent(text),
            lambda: analyze_context([text]),
            lambda: analyze_request(text),
            lambda: assess_clarification(text),
            lambda: analyze_structure(text),
            lambda: check_response_quality(text),
        )
        for operation in operations:
            with self.subTest(operation=operation), self.assertRaises(ValueError):
                operation()

    def test_pipeline_does_not_modify_history(self):
        history = ["The deadline changed."]
        result = analyze_request("Explain that.", history)
        self.assertEqual(history, ["The deadline changed."])
        self.assertEqual(len(result.context.turns), 2)

    def test_clarification_history_is_strict(self):
        for history in ("invalid", None, 5, {"text": "hello"}):
            with self.subTest(history=repr(history)), self.assertRaises(ValueError):
                assess_clarification("Explain that.", history)

    def test_intent_does_not_execute_instructions(self):
        result = classify_intent("Please translate this sentence.")
        self.assertEqual(result.intent, "translate")
        self.assertFalse(hasattr(result, "translation"))

    def test_no_entity_resolution_claim(self):
        result = analyze_context(["Explain it."])
        self.assertEqual(result.unresolved_references, (0,))

    def test_quality_is_not_fact_verification(self):
        result = check_response_quality("The moon is made of cheese.")
        self.assertTrue(result.accepted)
        self.assertFalse(hasattr(result, "factually_correct"))

    def test_deterministic_output(self):
        first = analyze_request("Why is this late?", ["The delivery is delayed."])
        second = analyze_request("Why is this late?", ["The delivery is delayed."])
        self.assertEqual(first, second)
