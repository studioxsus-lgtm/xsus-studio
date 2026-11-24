import unittest
from languages.sq.design_requests import analyze_design

class DesignRequestTests(unittest.TestCase):
    def test_modern(self):
        result = analyze_design("Krijo një dizajn modern me temë të errët, ngjyrë blu dhe dizajn responsive.")
        self.assertEqual((result.style, result.theme, result.primary_color, result.options), ("modern", "dark", "blue", ("responsive",)))

    def test_navigation(self):
        result = analyze_design("Projekto dizajn minimalist me navigim të poshtëm dhe tipografi moderne")
        self.assertEqual(result.options, ("bottom_navigation", "modern_typography"))

    def test_professional(self):
        self.assertEqual(analyze_design("Krijo dizajn profesional").style, "professional")

    def test_conflicts(self):
        for tail in ("temë të errët dhe temë të çelët", "ngjyrë blu dhe ngjyrë jeshile", "animacione dhe pa animacione"):
            self.assertIsNone(analyze_design("Krijo dizajn modern me " + tail))

    def test_unknown(self):
        for value in ("Mos krijo dizajn modern", "Krijo dizajn modern me zzqx", "Krijo dizajn modern?", "Krijo dizajn modern me", "a"*4097):
            self.assertIsNone(analyze_design(value))

    def test_no_animation(self):
        self.assertEqual(analyze_design("Krijo dizajn modern me pa animacione").options, ("no_animation",))

    def test_deduplication(self):
        self.assertEqual(analyze_design("Krijo dizajn modern me animacione dhe animacione").options, ("animation",))

    def test_no_authorization(self):
        self.assertFalse(analyze_design("Krijo dizajn modern").execution_authorized)
