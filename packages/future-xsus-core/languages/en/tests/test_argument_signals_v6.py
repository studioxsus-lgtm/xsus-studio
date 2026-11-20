import unittest
from dataclasses import asdict
from languages.en.text.argument_signals_v6 import analyze_argument_signals_v6


class ArgumentSignalsV6Tests(unittest.TestCase):
    def test_premise_because(self):
        r = analyze_argument_signals_v6("We stayed because it rained.")
        self.assertIn((0, "premise_marker", "because"), r.markers)

    def test_premise_given_that(self):
        r = analyze_argument_signals_v6("Given that it rained, we stayed.")
        self.assertIn((0, "premise_marker", "given that"), r.markers)

    def test_conclusion_therefore(self):
        r = analyze_argument_signals_v6("It rained. Therefore, we stayed.")
        self.assertIn((1, "conclusion_marker", "therefore"), r.markers)

    def test_conclusion_hence(self):
        r = analyze_argument_signals_v6("The test passed. Hence, we continue.")
        self.assertIn((1, "conclusion_marker", "hence"), r.markers)

    def test_qualification_although(self):
        r = analyze_argument_signals_v6("Although it rained, we walked.")
        self.assertIn((0, "qualification_marker", "although"), r.markers)

    def test_qualification_unless(self):
        r = analyze_argument_signals_v6("We proceed unless it fails.")
        self.assertIn((0, "qualification_marker", "unless"), r.markers)

    def test_evidence_according_to(self):
        r = analyze_argument_signals_v6("According to the report, sales rose.")
        self.assertIn((0, "evidence_marker", "according to"), r.markers)

    def test_evidence_data_show(self):
        r = analyze_argument_signals_v6("The data show a trend.")
        self.assertIn((0, "evidence_marker", "the data show"), r.markers)

    def test_no_markers(self):
        self.assertEqual(analyze_argument_signals_v6("Birds fly.").markers, ())

    def test_no_verification_claim(self):
        r = analyze_argument_signals_v6("Therefore, all claims are true.")
        self.assertFalse(r.validates_argument)
        self.assertFalse(r.verifies_evidence)

    def test_serializable(self):
        self.assertEqual(asdict(analyze_argument_signals_v6("Birds fly."))["sentence_count"], 1)

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            analyze_argument_signals_v6("")

    def test_invalid_type_rejected(self):
        with self.assertRaises(ValueError):
            analyze_argument_signals_v6([])

    def test_deterministic(self):
        s = "Because it rained, we stayed. Therefore, the plan changed."
        self.assertEqual(analyze_argument_signals_v6(s), analyze_argument_signals_v6(s))
