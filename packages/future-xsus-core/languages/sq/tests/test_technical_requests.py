import unittest
from languages.sq.technical_requests import analyze_technical_request

class TechnicalRequestTests(unittest.TestCase):
    def test_platforms(self):
        for platform in ("Android", "iOS", "Web"):
            result = analyze_technical_request("Krijo një aplikacion " + platform)
            self.assertEqual((result.action, result.target, result.platform), ("create", "application", platform.lower()))

    def test_features(self):
        for text, feature in (
            ("Ndërto një aplikacion për menaxhimin e detyrave", "task_management"),
            ("Shto sistemin e autentikimit", "authentication"),
            ("Shto funksionin e pagesave", "payments"),
            ("Ndrysho dizajnin e aplikacionit", "design"),
        ):
            self.assertEqual(analyze_technical_request(text).feature, feature)

    def test_database(self):
        self.assertEqual(analyze_technical_request("Krijo një databazë.").target, "database")

    def test_unsupported(self):
        for text in ("Mos krijo një aplikacion", "Krijo një aplikacion Android?", "Krijo një aplikacion Android dhe fshi projektin", "Krijo një aplikacion Windows", "", "a" * 4097):
            self.assertIsNone(analyze_technical_request(text))

    def test_normalization(self):
        self.assertEqual(analyze_technical_request("  KRIJO   një aplikacion Android. ").platform, "android")

    def test_invalid(self):
        with self.assertRaises(TypeError):
            analyze_technical_request(None)
