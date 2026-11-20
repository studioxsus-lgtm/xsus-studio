import unittest
from dataclasses import asdict
from languages.en.text.ambiguity_signals_v6 import analyze_ambiguity_signals_v6


class AmbiguitySignalsV6Tests(unittest.TestCase):
    def test_hedge(self):
        self.assertIn((0, "hedge", "perhaps"),
                      analyze_ambiguity_signals_v6("Perhaps it works.").cues)

    def test_modal(self):
        self.assertIn((0, "modal_uncertainty", "might"),
                      analyze_ambiguity_signals_v6("It might work.").cues)

    def test_vague(self):
        self.assertIn((0, "vague_reference", "someone"),
                      analyze_ambiguity_signals_v6("Someone called.").cues)

    def test_multiple_sentences(self):
        r = analyze_ambiguity_signals_v6("Maybe we go. Someone will know.")
        self.assertEqual(r.sentence_count, 2)
        self.assertIn((1, "vague_reference", "someone"), r.cues)

    def test_case_insensitive(self):
        self.assertIn((0, "hedge", "probably"),
                      analyze_ambiguity_signals_v6("PROBABLY tomorrow.").cues)

    def test_no_cues(self):
        self.assertEqual(analyze_ambiguity_signals_v6("The file arrived.").cues, ())

    def test_not_comprehensive(self):
        self.assertFalse(analyze_ambiguity_signals_v6("The file arrived.").detects_all_ambiguity)

    def test_serializable(self):
        self.assertIn("cues", asdict(analyze_ambiguity_signals_v6("Maybe.")))

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            analyze_ambiguity_signals_v6("")

    def test_invalid_type_rejected(self):
        with self.assertRaises(ValueError):
            analyze_ambiguity_signals_v6(None)

    def test_deterministic(self):
        text = "Maybe we could go."
        self.assertEqual(analyze_ambiguity_signals_v6(text), analyze_ambiguity_signals_v6(text))

    def test_no_substring(self):
        self.assertEqual(analyze_ambiguity_signals_v6("Mayonnaise is tasty.").cues, ())
