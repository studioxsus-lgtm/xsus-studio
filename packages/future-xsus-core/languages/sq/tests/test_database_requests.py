import unittest
from languages.sq.database_requests import analyze_database

class DatabaseRequestTests(unittest.TestCase):
    def test_columns(self):
        result = analyze_database("Krijo tabelën tasks me kolonat id: uuid, title: tekst dhe done: boolean.")
        self.assertEqual(result.table, "tasks")
        self.assertEqual(result.columns, (("id", "uuid"), ("title", "text"), ("done", "boolean")))

    def test_types(self):
        for source, expected in (("numër i plotë", "integer"), ("numër dhjetor", "decimal"), ("datë", "date")):
            self.assertEqual(analyze_database("Krijo tabelën items me kolonat value: " + source).columns, (("value", expected),))

    def test_crud(self):
        result = analyze_database("Shto operacionet krijim, lexim, përditësim dhe fshirje për tabelën tasks")
        self.assertEqual(result.operations, ("create", "read", "update", "delete"))

    def test_relationships(self):
        for source, expected in (("një me një", "one_to_one"), ("një me shumë", "one_to_many"), ("shumë me shumë", "many_to_many")):
            result = analyze_database("Lidh tabelën users me tabelën tasks " + source)
            self.assertEqual((result.related_table, result.relationship), ("tasks", expected))

    def test_duplicates(self):
        self.assertIsNone(analyze_database("Krijo tabelën tasks me kolonat id: uuid dhe id: tekst"))

    def test_unknown_and_injection(self):
        for value in ("Mos krijo tabelën tasks me kolonat id: uuid", "Krijo tabelën tasks me kolonat id: uuid; DROP TABLE users", "Krijo tabelën tasks me kolonat id: unknown", "Krijo tabelën tasks me kolonat id: uuid?", "a"*4097):
            self.assertIsNone(analyze_database(value))

    def test_no_execution(self):
        self.assertFalse(analyze_database("Krijo tabelën tasks me kolonat id: uuid").execution_authorized)

    def test_limit(self):
        self.assertIsNone(analyze_database("Krijo tabelën tasks me kolonat " + ", ".join(f"c{i}: tekst" for i in range(33))))

    def test_invalid(self):
        with self.assertRaises(TypeError):
            analyze_database(None)
