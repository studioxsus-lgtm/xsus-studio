import unittest
from languages.sq.complex_requests import analyze_requirements

class ComplexRequestTests(unittest.TestCase):
    def test_multiple(self):
        result = analyze_requirements("Krijo një aplikacion Android me autentikim, databazë dhe njoftime.")
        self.assertEqual(result.platform, "android")
        self.assertEqual(result.features, ("authentication", "database", "notifications"))

    def test_alias(self):
        result = analyze_requirements("Ndërto aplikacion Web me bazë të dhënash dhe databazë")
        self.assertEqual(result.features, ("database",))

    def test_design(self):
        self.assertEqual(analyze_requirements("Krijo aplikacion iOS me temë të errët").features, ("dark_theme",))
        self.assertEqual(analyze_requirements("Krijo aplikacion iOS me temë e errët").features, ("dark_theme",))

    def test_simple(self):
        self.assertEqual(analyze_requirements("Krijo aplikacion").features, ())

    def test_reject_partial(self):
        for value in ("Krijo aplikacion me autentikim dhe zzqx", "Mos krijo aplikacion me pagesa", "Krijo aplikacion me pagesa?", "Krijo aplikacion me ", "Krijo aplikacion me android", "Krijo aplikacion me " + ", ".join(["pagesa"]*17)):
            with self.subTest(value=value):
                self.assertIsNone(analyze_requirements(value))

    def test_existing_feature(self):
        result = analyze_requirements("Ndërto një aplikacion për menaxhimin e detyrave me njoftime")
        self.assertEqual(result.features, ("task_management", "notifications"))
