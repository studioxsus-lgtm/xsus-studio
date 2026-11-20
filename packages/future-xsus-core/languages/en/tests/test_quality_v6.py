import unittest
from languages.en.text.quality_v6 import check_response_quality

class QualityV6Tests(unittest.TestCase):
    def test_clean(self):
        result = check_response_quality("The report is ready.")
        self.assertTrue(result.accepted)
        self.assertEqual(result.token_count, 4)

    def test_whitespace(self):
        result = check_response_quality("  Ready. ")
        self.assertFalse(result.accepted)
        self.assertIn("surrounding_whitespace", result.warnings)

    def test_token_limit(self):
        result = check_response_quality("one two three", max_tokens=2)
        self.assertIn("token_limit_exceeded", result.warnings)

    def test_no_words(self):
        result = check_response_quality("123!")
        self.assertIn("no_english_words", result.warnings)

    def test_bad_limits(self):
        for value in (0, -1, True, 1.5):
            with self.subTest(value=value), self.assertRaises(ValueError):
                check_response_quality("Hello", max_tokens=value)
