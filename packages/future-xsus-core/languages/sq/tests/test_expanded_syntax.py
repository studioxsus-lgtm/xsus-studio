import unittest
from languages.sq.syntax import parse_clause
from languages.sq.advanced_syntax import parse_extended_clause
from languages.sq.questions import parse_marked_question

class ExpandedSyntaxTests(unittest.TestCase):
    def test_technical_objects(self):
        for text in ("Unë krijoj aplikacionin.", "Ne ndërtojmë projektin.", "Ata hapin faqen.", "Ti shkruan përgjigjen."):
            with self.subTest(text=text):
                result = parse_clause(text)
                self.assertIsNotNone(result)
                self.assertTrue(result.agreement)
                self.assertEqual(result.pattern, "SVO")

    def test_plural_object(self):
        self.assertEqual(parse_clause("Ne krijojmë aplikacionet.").object, "aplikacionet")

    def test_agreement_conflict(self):
        self.assertFalse(parse_clause("Unë krijojnë aplikacionin.").agreement)

    def test_intransitive_rejected(self):
        self.assertIsNone(parse_clause("Unë jam aplikacionin."))

    def test_unknown_object(self):
        self.assertIsNone(parse_clause("Unë krijoj zzqx."))

    def test_negation(self):
        result = parse_extended_clause("Unë nuk krijoj aplikacionin.")
        self.assertEqual(result.negated, (True,))

    def test_coordination(self):
        result = parse_extended_clause("Unë krijoj projektin dhe ti hap faqen.")
        self.assertEqual(len(result.clauses), 2)

    def test_marked_question(self):
        result = parse_marked_question("A ti hap faqen?")
        self.assertTrue(result.interrogative)
        self.assertTrue(result.clauses[0].agreement)

    def test_question_rejection(self):
        for text in ("A?", "A ti hap faqen.", "A ti hap zzqx?"):
            self.assertIsNone(parse_marked_question(text))
