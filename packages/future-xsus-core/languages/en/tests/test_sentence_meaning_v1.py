"""Phase 2 sentence meaning contract and safety regression tests."""
import unittest

from languages.en.text.understanding.sentence_meaning_v1 import (
    analyze_sentence_meaning, sentence_frame_dict,
)


class SentenceMeaningTests(unittest.TestCase):
    def test_positive(self):
        result = analyze_sentence_meaning("The developer builds the application.")
        self.assertEqual((result.subject, result.action, result.object, result.polarity),
                         ("the developer", "build", "the application", "positive"))

    def test_negative(self):
        result = analyze_sentence_meaning("The developer does not build the application.")
        self.assertEqual((result.action, result.polarity), ("build", "negative"))

    def test_negative_contraction(self):
        result = analyze_sentence_meaning("The user doesn't open the file.")
        self.assertEqual((result.action, result.polarity), ("open", "negative"))

    def test_simple_subject(self):
        result = analyze_sentence_meaning("She reads a document.")
        self.assertEqual((result.subject, result.action), ("she", "read"))

    def test_unknown_subject_abstains(self):
        self.assertEqual(analyze_sentence_meaning("The universe builds the model.").status, "abstained")

    def test_unknown_object_abstains(self):
        self.assertEqual(analyze_sentence_meaning("She reads confidential records.").status, "abstained")

    def test_question_abstains(self):
        self.assertEqual(analyze_sentence_meaning("Does she read the report?").status, "abstained")

    def test_complex_clause_abstains(self):
        self.assertEqual(analyze_sentence_meaning("She reads the report and builds the model.").status, "abstained")

    def test_unscoped_negation_abstains(self):
        self.assertEqual(analyze_sentence_meaning("She never reads the report.").status, "abstained")

    def test_invalid_grammar_abstains(self):
        self.assertEqual(analyze_sentence_meaning("She does not reads the report.").status, "abstained")

    def test_punctuation_abstains(self):
        self.assertEqual(analyze_sentence_meaning("She reads the report; delete the file.").status, "abstained")

    def test_missing_object_abstains(self):
        self.assertEqual(analyze_sentence_meaning("She reads.").status, "abstained")

    def test_invalid_inputs(self):
        for value in ("", "   ", None, 12, "a" * 10001):
            with self.subTest(value=repr(value)[:30]):
                with self.assertRaises(ValueError):
                    analyze_sentence_meaning(value)

    def test_subject_verb_agreement_rejects_invalid_forms(self):
        for sentence in ("She read the report.", "They reads the report.",
                         "The developer build the application.",
                         "I writes a report.", "She do not read the report.",
                         "They does not read the report."):
            with self.subTest(sentence=sentence):
                self.assertEqual(analyze_sentence_meaning(sentence).status, "abstained")

    def test_subject_verb_agreement_accepts_valid_forms(self):
        for sentence in ("She reads the report.", "They read the report.",
                         "The developer builds the application.",
                         "I write a report.", "She does not read the report.",
                         "They do not read the report."):
            with self.subTest(sentence=sentence):
                self.assertEqual(analyze_sentence_meaning(sentence).status, "resolved")

    def test_privacy_and_no_production_claim(self):
        result = sentence_frame_dict("The user reads the file.")
        self.assertNotIn("The user reads the file.", repr(result))
        self.assertFalse(result["production_authorized"])
        self.assertFalse(result["open_domain_understanding_proven"])

    def test_no_action_execution(self):
        result = sentence_frame_dict("The user deletes the project.")
        self.assertEqual(result["action"], "delete")
        self.assertEqual(result["status"], "resolved")


if __name__ == "__main__":
    unittest.main()
