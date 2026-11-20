"""Regression coverage for conservative V6 semantic signals."""
import unittest
from languages.en.text.semantic_signals import analyze_semantic_signals

class SemanticSignalsTests(unittest.TestCase):
    def test_wh_questions(self):
        for word in ("Who", "What", "When", "Where", "Why", "How", "Which", "Whose", "Whom"):
            with self.subTest(word=word):
                result = analyze_semantic_signals(f"{word} is responsible?")
                self.assertEqual(result.question_word, word.lower())
                self.assertEqual(result.sentence_type, "question")
                self.assertEqual(result.confidence, "high")

    def test_yes_no_questions(self):
        result = analyze_semantic_signals("Can Alex help?")
        self.assertEqual(result.sentence_type, "question")
        self.assertIsNone(result.question_word)
        self.assertEqual(result.confidence, "high")

    def test_explicit_negation(self):
        for text in ("I do not agree.", "We never agreed.", "She doesn't know.", "They cannot attend."):
            with self.subTest(text=text):
                self.assertTrue(analyze_semantic_signals(text).negated)

    def test_no_false_negation_from_substrings(self):
        for text in ("The notebook is new.", "Notable results.", "Nobody knows."):
            with self.subTest(text=text):
                self.assertFalse(analyze_semantic_signals(text).negated)

    def test_uncertain_question(self):
        result = analyze_semantic_signals("Perhaps tomorrow?")
        self.assertEqual(result.confidence, "low")
        self.assertIsNone(result.question_word)

    def test_non_english_tokens_are_not_invented(self):
        result = analyze_semantic_signals("123?!")
        self.assertEqual(result.sentence_type, "unknown")
        self.assertEqual(result.tokens, ())

    def test_validation(self):
        for value in ("", "   ", "a" * 10001, None, 42):
            with self.subTest(value=str(value)[:20]), self.assertRaises(ValueError):
                analyze_semantic_signals(value)

    def test_case_normalization(self):
        self.assertEqual(analyze_semantic_signals("WHERE IS IT?").tokens, ("where", "is", "it"))
