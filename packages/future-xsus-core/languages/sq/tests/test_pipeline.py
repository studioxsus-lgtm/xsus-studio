import unittest
from languages.sq.pipeline import analyze_text

class AlbanianPipelineTests(unittest.TestCase):
    def test_end_to_end_svo(self):
        result = analyze_text("Ai ka librin.")
        self.assertEqual(result.language, None)
        self.assertEqual(result.clause.clauses[0].object, "librin")
        self.assertTrue(result.clause.clauses[0].agreement)

    def test_end_to_end_negation(self):
        result = analyze_text("Unë nuk jam.")
        self.assertEqual(result.language, "sq")
        self.assertEqual(result.clause.negated, (True,))

    def test_verb_features(self):
        result = analyze_text("Ne jemi.")
        readings = result.tokens[1].verbs
        self.assertTrue(any(r.person == 1 and r.number == "Plur" for r in readings))

    def test_noun_features(self):
        result = analyze_text("Ai ka librin.")
        analyses = result.tokens[2].nominals
        self.assertTrue(any(a.case == "Acc" and a.lemma == "libër" for a in analyses))

    def test_unknown_syntax_is_explicit(self):
        result = analyze_text("Kjo fjali është shumë e gjatë.")
        self.assertIsNone(result.clause)
        self.assertGreater(len(result.tokens), 0)

    def test_empty_text(self):
        result = analyze_text("")
        self.assertEqual(result.tokens, ())
        self.assertIsNone(result.clause)

    def test_original_token_preserved(self):
        result = analyze_text("UNË jam!")
        self.assertEqual(result.tokens[0].token, "UNË")
        self.assertEqual(result.tokens[0].normalized, "unë")

    def test_unsupported_language_is_not_guessed(self):
        result = analyze_text("Hello world.")
        self.assertIsNone(result.language)
        self.assertIsNone(result.clause)

    def test_type_validation(self):
        with self.assertRaises(TypeError):
            analyze_text(None)

if __name__ == "__main__":
    unittest.main()
