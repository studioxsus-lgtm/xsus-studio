"""Advanced grammar constrained recognizer regression."""
import unittest
from languages.en.text.understanding.advanced_grammar_v1 import (
    analyze_advanced_grammar, advanced_grammar_dict,
)


class AdvancedGrammarTests(unittest.TestCase):
    def test_wh_question(self):
        result = analyze_advanced_grammar("What does she review the report?")
        self.assertEqual((result.status, result.kind),
                         ("resolved", "wh_question_what"))

    def test_wh_past(self):
        result = analyze_advanced_grammar("Why did they review the report?")
        self.assertEqual((result.status, result.tense),
                         ("resolved", "past_simple"))

    def test_present_progressive(self):
        result = analyze_advanced_grammar("She is reviewing the report.")
        self.assertEqual((result.status, result.tense),
                         ("resolved", "present_progressive"))

    def test_past_progressive(self):
        result = analyze_advanced_grammar("They were reviewing the report.")
        self.assertEqual((result.status, result.tense),
                         ("resolved", "past_progressive"))

    def test_present_perfect(self):
        result = analyze_advanced_grammar("She has reviewed the report.")
        self.assertEqual((result.status, result.tense),
                         ("resolved", "present_perfect"))

    def test_past_perfect(self):
        result = analyze_advanced_grammar("They had reviewed the report.")
        self.assertEqual((result.status, result.tense),
                         ("resolved", "past_perfect"))

    def test_passive(self):
        result = analyze_advanced_grammar("The report was reviewed by the developer.")
        self.assertEqual((result.status, result.kind), ("resolved", "passive"))

    def test_bad_agreement(self):
        self.assertEqual(analyze_advanced_grammar(
            "They has reviewed the report.").status, "abstained")

    def test_complex_abstains(self):
        self.assertEqual(analyze_advanced_grammar(
            "She has reviewed the report because he requested it.").status,
            "abstained")

    def test_no_unsupported_echo(self):
        result = advanced_grammar_dict("She has reviewed confidential data.")
        self.assertEqual(result["status"], "abstained")
        self.assertNotIn("confidential", repr(result))
        self.assertFalse(result["complete_english_grammar_proven"])


if __name__ == "__main__":
    unittest.main()
