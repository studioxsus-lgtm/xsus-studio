"""Regression tests for stages 1–5, without touching the English engine."""
import unittest
from languages.sq import ALPHABET, detect_language, lookup, normalize, tokenize

class AlbanianFoundationsTests(unittest.TestCase):
    def test_alphabet(self):
        self.assertEqual(len(ALPHABET), 36)
        self.assertIn("xh", ALPHABET)
        self.assertIn("ë", ALPHABET)
        self.assertIn("ç", ALPHABET)

    def test_unicode_normalization(self):
        self.assertEqual(normalize("  C\u0327'ËSHTË  "), "ç'është")

    def test_tokenizer(self):
        self.assertEqual(tokenize("Përshëndetje, Shqipëri!"), ["Përshëndetje", ",", "Shqipëri", "!"])

    def test_tokenizer_numbers(self):
        self.assertEqual(tokenize("3,14 dhe 20."), ["3,14", "dhe", "20", "."])

    def test_lexicon(self):
        self.assertEqual(lookup("SHKOLLË"), "NOUN")
        self.assertIsNone(lookup("unknownword"))

    def test_detect_albanian(self):
        self.assertEqual(detect_language("Unë mësoj gjuhën shqipe."), "sq")

    def test_unknown_not_mislabeled(self):
        self.assertIsNone(detect_language("The quick brown fox."))

    def test_empty_text(self):
        self.assertEqual(tokenize(""), [])
        self.assertIsNone(detect_language(""))

    def test_type_validation(self):
        with self.assertRaises(TypeError):
            normalize(None)
        with self.assertRaises(TypeError):
            tokenize(None)

if __name__ == "__main__":
    unittest.main()
