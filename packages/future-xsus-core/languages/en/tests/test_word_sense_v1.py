"""Unit and adversarial checks for bounded contextual word senses."""
import unittest

from languages.en.text.understanding.word_sense_v1 import (
    analyze_word_sense as analyze, supported_words,
)

class WordSenseTests(unittest.TestCase):
    def test_supported_vocabulary(self):
        self.assertEqual(set(supported_words()), {"bank", "bat", "crane", "seal", "spring", "python"})

    def test_financial_bank(self):
        result = analyze("I opened a savings account at the bank.", "bank")
        self.assertEqual((result.status, result.sense), ("resolved", "financial_institution"))
        self.assertIn("account", result.evidence)

    def test_river_bank(self):
        self.assertEqual(analyze("We sat by the river bank.", "bank").sense, "river_edge")

    def test_sports_bat(self):
        self.assertEqual(analyze("He swung the baseball bat.", "bat").sense, "sports_equipment")

    def test_animal_bat(self):
        self.assertEqual(analyze("The bat flew into a cave.", "bat").sense, "animal")

    def test_crane_machine(self):
        self.assertEqual(analyze("The construction crane lifted steel.", "crane").sense, "lifting_machine")

    def test_crane_bird(self):
        self.assertEqual(analyze("The crane built a nest.", "crane").sense, "bird")

    def test_seal_closure(self):
        self.assertEqual(analyze("Put a wax seal on the envelope.", "seal").sense, "closure")

    def test_seal_animal(self):
        self.assertEqual(analyze("The seal swam in the ocean.", "seal").sense, "animal")

    def test_spring_season(self):
        self.assertEqual(analyze("Flowers bloom in spring.", "spring").sense, "season")

    def test_spring_coil(self):
        self.assertEqual(analyze("The metal spring is a coil.", "spring").sense, "mechanical_coil")

    def test_spring_water(self):
        self.assertEqual(analyze("The mountain spring supplies water.", "spring").sense, "water_source")

    def test_python_language(self):
        self.assertEqual(analyze("Write Python code for this function.", "python").sense, "programming_language")

    def test_python_snake(self):
        self.assertEqual(analyze("The python is a constrictor snake.", "python").sense, "snake")

    def test_no_evidence_abstains(self):
        result = analyze("I visited the bank.", "bank")
        self.assertEqual((result.status, result.sense), ("insufficient_evidence", None))

    def test_conflicting_cues_abstain(self):
        result = analyze("The river bank holds my money.", "bank")
        self.assertEqual((result.status, result.sense), ("ambiguous", None))

    def test_multiple_mentions_different_senses_abstain(self):
        result = analyze("The river bank was quiet. " + "far " * 20 + "The bank approved a loan.", "bank")
        self.assertEqual((result.status, result.sense), ("ambiguous", None))

    def test_multiple_mentions_same_sense(self):
        result = analyze("The river bank is wet. " + "far " * 20 + "The stream bank is muddy.", "bank")
        self.assertEqual(result.sense, "river_edge")

    def test_unsupported_word(self):
        result = analyze("The apple fell.", "apple")
        self.assertEqual((result.status, result.sense), ("unknown", None))

    def test_target_absent(self):
        self.assertEqual(analyze("A river flows.", "bank").status, "target_absent")

    def test_case_insensitive(self):
        self.assertEqual(analyze("The RIVER BANK is wet.", "BANK").sense, "river_edge")

    def test_window_boundary(self):
        self.assertEqual(analyze("river one two three bank", "bank", window=2).status, "insufficient_evidence")
        self.assertEqual(analyze("river one two three bank", "bank", window=4).sense, "river_edge")

    def test_validation(self):
        for text, target, window in [("", "bank", 6), ("hello", "two words", 6),
                                     ("hello", "bank", 0), ("hello", "bank", True),
                                     ("x" * 10001, "bank", 6)]:
            with self.subTest(text=text[:12], target=target, window=window):
                with self.assertRaises(ValueError):
                    analyze(text, target, window=window)

    def test_no_raw_input_in_report(self):
        result = analyze("My private bank account is SECRET-123.", "bank")
        self.assertNotIn("SECRET-123", repr(result))
        self.assertNotIn("private", result.evidence)

if __name__ == "__main__":
    unittest.main()
