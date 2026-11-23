import unittest
from languages.sq.advanced_syntax import parse_extended_clause

class AdvancedSyntaxTests(unittest.TestCase):
    def test_negation(self):
        result = parse_extended_clause("Unë nuk jam.")
        self.assertEqual(result.negated, (True,))
        self.assertTrue(result.clauses[0].agreement)

    def test_question(self):
        result = parse_extended_clause("Ti je?")
        self.assertTrue(result.interrogative)
        self.assertEqual(result.clauses[0].subject, "ti")

    def test_coordinated_clauses(self):
        result = parse_extended_clause("Unë jam dhe ti je.")
        self.assertEqual(result.connector, "dhe")
        self.assertEqual(len(result.clauses), 2)

    def test_mixed_negation(self):
        result = parse_extended_clause("Unë nuk jam por ti je.")
        self.assertEqual(result.negated, (True, False))

    def test_object_and_question(self):
        result = parse_extended_clause("Ai nuk ka librin?")
        self.assertEqual(result.clauses[0].object, "librin")
        self.assertTrue(result.interrogative)

    def test_reject_unrecognized_order(self):
        self.assertIsNone(parse_extended_clause("Ka ai librin?"))

    def test_reject_dangling_connector(self):
        self.assertIsNone(parse_extended_clause("Unë jam dhe"))

    def test_reject_multiple_connectors(self):
        self.assertIsNone(parse_extended_clause("Unë jam dhe ti je por ai është."))

    def test_empty_and_unknown(self):
        self.assertIsNone(parse_extended_clause(""))
        self.assertIsNone(parse_extended_clause("Fjali e panjohur."))

    def test_type_validation(self):
        with self.assertRaises(TypeError):
            parse_extended_clause(None)

if __name__ == "__main__":
    unittest.main()
