"""Grammar pattern acceptance and abstention."""
import unittest

from languages.en.text.understanding.grammar_patterns_v1 import (
    analyze_grammar_pattern, grammar_pattern_dict,
)


class GrammarPatternsTests(unittest.TestCase):
    def test_present(self):
        result = analyze_grammar_pattern("She reviews the report.")
        self.assertEqual((result.status, result.tense), ("resolved", "present_simple"))

    def test_regular_past(self):
        result = analyze_grammar_pattern("They reviewed the report.")
        self.assertEqual((result.status, result.tense), ("resolved", "past_simple"))

    def test_modal(self):
        result = analyze_grammar_pattern("She can review the report.")
        self.assertEqual((result.status, result.modal), ("resolved", "can"))

    def test_negative_modal(self):
        result = analyze_grammar_pattern("She should not review the report.")
        self.assertEqual((result.status, result.polarity), ("resolved", "negative"))

    def test_negative_auxiliary(self):
        result = analyze_grammar_pattern("She does not review the report.")
        self.assertEqual((result.status, result.polarity), ("resolved", "negative"))

    def test_question(self):
        result = analyze_grammar_pattern("Does she review the report?")
        self.assertEqual((result.status, result.kind), ("resolved", "yes_no_question"))

    def test_modal_question(self):
        result = analyze_grammar_pattern("Can she review the report?")
        self.assertEqual((result.status, result.kind), ("resolved", "yes_no_question"))

    def test_bad_agreement(self):
        self.assertEqual(analyze_grammar_pattern("Does they review the report?").status,
                         "abstained")

    def test_complex_clause_abstains(self):
        self.assertEqual(analyze_grammar_pattern(
            "She reviews the report because he requests it.").status, "abstained")

    def test_no_raw_echo_or_completion_claim(self):
        result = grammar_pattern_dict("She reviews confidential information.")
        self.assertEqual(result["status"], "abstained")
        self.assertNotIn("confidential", repr(result))
        self.assertFalse(result["complete_english_grammar_proven"])


if __name__ == "__main__":
    unittest.main()
