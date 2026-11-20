import unittest
from languages.en.text.clarification_v6 import assess_clarification

class ClarificationV6Tests(unittest.TestCase):
    def test_missing_task(self):
        self.assertIn("missing_or_unrecognized_task", assess_clarification("Translate").reasons)

    def test_reference_without_history(self):
        self.assertIn("reference_without_prior_turn", assess_clarification("Explain that.").reasons)

    def test_reference_with_history(self):
        result = assess_clarification("Explain that.", ["The deadline changed."])
        self.assertNotIn("reference_without_prior_turn", result.reasons)

    def test_explicit_request(self):
        self.assertFalse(assess_clarification("Explain the process.").needed)

    def test_invalid_history(self):
        with self.assertRaises(ValueError):
            assess_clarification("Hello.", history="invalid")
