import unittest
from core.routing.sq_analysis_dispatch import (
    SUPPORTED_ANALYSIS_LANGUAGES,
    UnsupportedAnalysisLanguage,
    dispatch_analysis,
)

class AlbanianDispatchTests(unittest.TestCase):
    def test_explicit_albanian_route(self):
        result = dispatch_analysis("Unë jam.", language="sq")
        self.assertEqual(result.requested_language, "sq")
        self.assertTrue(result.analysis.clause.clauses[0].agreement)

    def test_case_insensitive_language_code(self):
        result = dispatch_analysis("Unë jam.", language=" SQ ")
        self.assertEqual(result.requested_language, "sq")

    def test_no_implicit_english_override(self):
        with self.assertRaises(UnsupportedAnalysisLanguage):
            dispatch_analysis("Hello", language="en")

    def test_unknown_language_rejected(self):
        with self.assertRaises(UnsupportedAnalysisLanguage):
            dispatch_analysis("Bonjour", language="fr")

    def test_no_guess_on_missing_language(self):
        with self.assertRaises(TypeError):
            dispatch_analysis("Unë jam.", language=None)

    def test_no_guess_on_missing_text(self):
        with self.assertRaises(TypeError):
            dispatch_analysis(None, language="sq")

    def test_registry_is_isolated(self):
        self.assertEqual(SUPPORTED_ANALYSIS_LANGUAGES, frozenset({"sq"}))

if __name__ == "__main__":
    unittest.main()
