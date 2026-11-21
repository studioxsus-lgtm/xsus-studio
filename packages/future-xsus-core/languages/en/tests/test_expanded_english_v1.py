"""Expanded controlled-English lexical and agreement regression."""
import unittest
from languages.en.text.understanding.expanded_english_v1 import (
    SUBJECTS, VERBS, NOUNS, analyze_expanded_english, expanded_english_dict,
)


class ExpandedEnglishTests(unittest.TestCase):
    def test_every_verb(self):
        for verb in VERBS:
            with self.subTest(verb=verb):
                frame = analyze_expanded_english(f"They {verb} the report.")
                self.assertEqual(frame.status, "resolved")
                self.assertEqual(frame.action, verb)

    def test_every_noun(self):
        for noun in NOUNS:
            with self.subTest(noun=noun):
                self.assertEqual(analyze_expanded_english(
                    f"They read the {noun}.").status, "resolved")

    def test_every_subject(self):
        for subject in SUBJECTS:
            with self.subTest(subject=subject):
                frame = analyze_expanded_english(f"{subject} do not read the report."
                    if subject not in {"he", "she", "the user", "the teacher",
                    "the student", "the developer", "the engineer", "the researcher",
                    "the analyst", "the manager", "the system"}
                    else f"{subject} does not read the report.")
                self.assertEqual(frame.status, "resolved")

    def test_inflected_verbs(self):
        self.assertEqual(analyze_expanded_english("She classifies the dataset.").action, "classify")
        self.assertEqual(analyze_expanded_english("She processes the dataset.").action, "process")

    def test_bad_agreement_abstains(self):
        self.assertEqual(analyze_expanded_english("She read the report.").status, "abstained")
        self.assertEqual(analyze_expanded_english("They reads the report.").status, "abstained")
        self.assertEqual(analyze_expanded_english("She do not read the report.").status, "abstained")

    def test_complex_clause_abstains(self):
        self.assertEqual(analyze_expanded_english(
            "They read the report and write the document.").status, "abstained")

    def test_no_raw_text_echo(self):
        result = expanded_english_dict("They read confidential documents.")
        self.assertEqual(result["status"], "abstained")
        self.assertNotIn("confidential", repr(result))
        self.assertFalse(result["production_authorized"])


if __name__ == "__main__":
    unittest.main()
