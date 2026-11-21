"""Bounded tense and modifier grammar tests."""
import unittest

from languages.en.text.understanding.expanded_structures_v1 import (
    ADJECTIVES, ADVERBS, analyze_structured_clause, structured_clause_dict,
)


class ExpandedStructuresTests(unittest.TestCase):
    def test_present_adjective_and_adverb(self):
        result = analyze_structured_clause("She carefully reviews the detailed report.")
        self.assertEqual(result.status, "resolved")
        self.assertEqual(result.tense, "present_simple")
        self.assertEqual(result.adverb, "carefully")
        self.assertEqual(result.adjective, "detailed")
        self.assertEqual(result.action, "review")

    def test_regular_past(self):
        result = analyze_structured_clause("They reviewed the detailed report.")
        self.assertEqual(result.status, "resolved")
        self.assertEqual(result.tense, "past_simple")

    def test_every_adjective(self):
        for adjective in ADJECTIVES:
            with self.subTest(adjective=adjective):
                self.assertEqual(analyze_structured_clause(
                    f"They review the {adjective} report.").status, "resolved")

    def test_every_adverb(self):
        for adverb in ADVERBS:
            with self.subTest(adverb=adverb):
                self.assertEqual(analyze_structured_clause(
                    f"They {adverb} review the report.").status, "resolved")

    def test_invalid_agreement(self):
        self.assertEqual(analyze_structured_clause(
            "She review the report.").status, "abstained")

    def test_complex_clause_abstains(self):
        self.assertEqual(analyze_structured_clause(
            "She reviews the report because they requested it.").status, "abstained")

    def test_unknown_word_does_not_echo(self):
        result = structured_clause_dict("They carefully review the confidential report.")
        self.assertEqual(result["status"], "abstained")
        self.assertNotIn("confidential", repr(result))
        self.assertFalse(result["production_authorized"])


if __name__ == "__main__":
    unittest.main()
