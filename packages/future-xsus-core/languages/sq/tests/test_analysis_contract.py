import unittest
from core.contracts.common import LanguageTag
from core.routing.sq_analysis_contract import analyze_albanian

class AlbanianAnalysisContractTests(unittest.TestCase):
    def test_typed_response(self):
        result = analyze_albanian("Unë jam.", language=LanguageTag("sq"))
        self.assertEqual(result.language.value, "sq")
        self.assertTrue(result.analysis.clause.clauses[0].agreement)
        self.assertTrue(result.quality.syntax_supported)

    def test_does_not_override_english(self):
        with self.assertRaises(ValueError):
            analyze_albanian("Hello", language=LanguageTag("en"))

    def test_no_implicit_region_support(self):
        with self.assertRaises(ValueError):
            analyze_albanian("Unë jam.", language=LanguageTag("sq-AL"))

    def test_language_type(self):
        with self.assertRaises(TypeError):
            analyze_albanian("Unë jam.", language="sq")

    def test_text_type(self):
        with self.assertRaises(TypeError):
            analyze_albanian(None, language=LanguageTag("sq"))

    def test_unsupported_syntax_remains_explicit(self):
        result = analyze_albanian("Fjali e panjohur.", language=LanguageTag("sq"))
        self.assertIsNone(result.analysis.clause)
        self.assertFalse(result.quality.syntax_supported)

if __name__ == "__main__":
    unittest.main()
