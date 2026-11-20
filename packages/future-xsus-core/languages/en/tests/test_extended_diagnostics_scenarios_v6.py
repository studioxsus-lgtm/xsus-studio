"""Cross-component regression scenarios for opt-in English diagnostics."""
import json
import unittest

from languages.en.text.extended_diagnostics_v6 import analyze_extended_v6


class ExtendedDiagnosticsScenariosV6Tests(unittest.TestCase):
    def analyze(self, text, history=()):
        return analyze_extended_v6(text, history)

    def test_contrast_and_reference_together(self):
        r = self.analyze("Alex finished the report. However, she could revise it.")
        self.assertIn((1, "contrast", "however"), r["discourse"]["explicit_cues"])
        self.assertIn((1, "she"), r["reference_signals"]["references"])
        self.assertIn((1, "modal_uncertainty", "could"), r["ambiguity_signals"]["cues"])

    def test_premise_and_conclusion_together(self):
        r = self.analyze("Because the test failed, we paused. Therefore, we revised the plan.")
        labels = {item[1] for item in r["argument_signals"]["markers"]}
        self.assertIn("premise_marker", labels)
        self.assertIn("conclusion_marker", labels)

    def test_multiword_discourse_and_evidence_cues(self):
        r = self.analyze("According to the report, costs rose. As a result, we revised the plan.")
        self.assertIn((0, "evidence_marker", "according to"), r["argument_signals"]["markers"])
        self.assertIn((1, "consequence", "as a result"), r["discourse"]["explicit_cues"])

    def test_lexical_overlap_does_not_claim_coherence(self):
        r = self.analyze("The report arrived. The report was incomplete.")
        self.assertEqual(r["discourse"]["adjacent_shared_terms"],
                         ((0, 1, ("report",)),))
        self.assertTrue(r["discourse"]["lexical_overlap_is_not_coherence"])

    def test_no_overlap_does_not_claim_incoherence(self):
        r = self.analyze("Birds migrate. Engines require maintenance.")
        self.assertEqual(r["discourse"]["adjacent_without_shared_terms"], ((0, 1),))

    def test_opening_reference_remains_unresolved(self):
        r = self.analyze("They arrived before sunrise.")
        self.assertEqual(r["reference_signals"]["opening_sentence_references"], ("they",))
        self.assertFalse(r["capabilities"]["resolves_references"])

    def test_uncertainty_cues_do_not_establish_falsehood(self):
        r = self.analyze("Perhaps the data could change.")
        self.assertIn((0, "hedge", "perhaps"), r["ambiguity_signals"]["cues"])
        self.assertFalse(r["capabilities"]["verifies_facts"])

    def test_missing_cues_do_not_establish_truth(self):
        r = self.analyze("Every statement in this document is true.")
        self.assertFalse(r["capabilities"]["verifies_facts"])
        self.assertFalse(r["capabilities"]["verifies_arguments"])

    def test_qualified_argument(self):
        r = self.analyze("Although the report is incomplete, we may proceed.")
        self.assertIn((0, "qualification_marker", "although"), r["argument_signals"]["markers"])
        self.assertIn((0, "modal_uncertainty", "may"), r["ambiguity_signals"]["cues"])

    def test_history_preserves_base_contract(self):
        from languages.en.text.analysis_api_v6 import analyze_text_v6
        history = ["We discussed a project."]
        text = "Could you clarify the plan?"
        self.assertEqual(self.analyze(text, history)["base"], analyze_text_v6(text, history))

    def test_multiple_sentences_have_stable_indices(self):
        r = self.analyze("The report arrived. However, it was incomplete. Therefore, we paused.")
        self.assertEqual(r["discourse"]["sentence_count"], 3)
        self.assertIn((2, "consequence", "therefore"), r["discourse"]["explicit_cues"])

    def test_serialization_after_combined_signals(self):
        r = self.analyze("Alex arrived. However, she might leave.")
        self.assertEqual(json.loads(json.dumps(r))["language"], "en")

    def test_repeatability_with_history(self):
        text = "Perhaps they can proceed."
        history = ["The team reviewed the report."]
        self.assertEqual(self.analyze(text, history), self.analyze(text, history))

    def test_long_valid_input(self):
        text = ("The report is ready. " * 300).strip()
        self.assertLessEqual(len(text), 10000)
        self.assertEqual(self.analyze(text)["discourse"]["sentence_count"], 300)

    def test_too_long_rejected(self):
        with self.assertRaises(ValueError):
            self.analyze("x" * 10001)

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            self.analyze("   ")

    def test_invalid_history_rejected(self):
        with self.assertRaises(ValueError):
            self.analyze("The report arrived.", history="not-a-list")

    def test_no_execution_capability(self):
        self.assertFalse(self.analyze("Delete the files.")["capabilities"]["executes_actions"])
