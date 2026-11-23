import unittest
from languages.sq.syntax import parse_clause

class AlbanianSyntaxTests(unittest.TestCase):
    def test_simple_subject_verb(self):
        result = parse_clause("Unë jam.")
        self.assertEqual(result.pattern, "SV")
        self.assertTrue(result.agreement)

    def test_subject_verb_object(self):
        result = parse_clause("Ai ka librin.")
        self.assertEqual((result.subject, result.predicate, result.object),
                         ("ai", "ka", "librin"))
        self.assertEqual(result.pattern, "SVO")
        self.assertTrue(result.agreement)

    def test_agreement_mismatch_is_visible(self):
        result = parse_clause("Unë janë.")
        self.assertFalse(result.agreement)

    def test_plural_agreement(self):
        self.assertTrue(parse_clause("Ne jemi!").agreement)

    def test_unrecognized_sentence(self):
        self.assertIsNone(parse_clause("Fjalia shumë e ndërlikuar."))

    def test_unknown_object_not_guessed(self):
        self.assertIsNone(parse_clause("Ai ka diçka."))

    def test_no_subject_not_guessed(self):
        self.assertIsNone(parse_clause("Është mirë."))

    def test_invalid_input(self):
        with self.assertRaises(TypeError):
            parse_clause(None)

if __name__ == "__main__":
    unittest.main()
