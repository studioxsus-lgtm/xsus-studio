import unittest
from languages.sq.quality import evaluate_text

class AlbanianQualityTests(unittest.TestCase):
    def test_supported_clause(self):
        report = evaluate_text("Unë jam.")
        self.assertTrue(report.syntax_supported)
        self.assertTrue(report.agreement_ok)
        self.assertTrue(report.language_evidence)

    def test_agreement_warning(self):
        report = evaluate_text("Unë janë.")
        self.assertFalse(report.agreement_ok)
        self.assertIn("subject_verb_disagreement", report.warnings)

    def test_unknown_syntax(self):
        report = evaluate_text("Fjali e panjohur.")
        self.assertFalse(report.syntax_supported)
        self.assertIn("unsupported_syntax", report.warnings)

    def test_coverage_bounds(self):
        report = evaluate_text("Unë jam.")
        self.assertGreaterEqual(report.lexical_coverage, 0.0)
        self.assertLessEqual(report.lexical_coverage, 1.0)

    def test_unknown_word_coverage(self):
        report = evaluate_text("Unë xyzfjale.")
        self.assertEqual(report.word_count, 2)
        self.assertEqual(report.analyzed_words, 1)
        self.assertEqual(report.lexical_coverage, 0.5)

    def test_empty_text(self):
        report = evaluate_text("")
        self.assertEqual(report.token_count, 0)
        self.assertEqual(report.lexical_coverage, 0.0)
        self.assertIn("no_words", report.warnings)

    def test_unconfirmed_language(self):
        report = evaluate_text("Hello world.")
        self.assertFalse(report.language_evidence)
        self.assertIn("language_unconfirmed", report.warnings)

    def test_no_false_success_for_unsupported(self):
        report = evaluate_text("Hello world.")
        self.assertIsNone(report.agreement_ok)

    def test_type_validation(self):
        with self.assertRaises(TypeError):
            evaluate_text(None)

if __name__ == "__main__":
    unittest.main()
