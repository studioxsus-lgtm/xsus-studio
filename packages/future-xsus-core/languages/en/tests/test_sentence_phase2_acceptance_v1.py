"""Final Phase 2 engineering acceptance and failure injection."""
import unittest
from unittest.mock import patch

from languages.en.evaluation.sentence_phase2_acceptance_v1 import evaluate_phase2_acceptance


class Phase2AcceptanceTests(unittest.TestCase):
    def test_all_bounded_diagnostics_pass(self):
        result = evaluate_phase2_acceptance()
        self.assertTrue(result["engineering_acceptance_passed"])
        self.assertEqual(result["diagnostic_cases"], 88)
        self.assertEqual(result["stress_iterations"], 100)
        self.assertTrue(all(result["checks"].values()))

    def test_scope_never_claims_production_or_general_semantics(self):
        result = evaluate_phase2_acceptance()
        for key in ("production_authorized", "independent_external_holdout_proven",
                    "open_domain_understanding_proven", "logical_contradiction_proven",
                    "document_understanding_proven"):
            self.assertFalse(result[key], key)

    def test_fails_closed_when_evidence_diagnostic_fails(self):
        from languages.en.evaluation.sentence_evidence_benchmark_v1 import evaluate_sentence_evidence
        failed = evaluate_sentence_evidence()
        failed["passed"] = False
        with patch("languages.en.evaluation.sentence_phase2_acceptance_v1.evaluate_sentence_evidence",
                   return_value=failed):
            self.assertFalse(evaluate_phase2_acceptance()["engineering_acceptance_passed"])

    def test_fails_closed_when_batch_stress_fails(self):
        from languages.en.evaluation.sentence_batch_stress_v1 import evaluate_batch_stress
        failed = evaluate_batch_stress(1)
        failed["passed"] = False
        with patch("languages.en.evaluation.sentence_phase2_acceptance_v1.evaluate_batch_stress",
                   return_value=failed):
            self.assertFalse(evaluate_phase2_acceptance()["engineering_acceptance_passed"])

    def test_fails_closed_when_sentence_quality_fails(self):
        from languages.en.evaluation.sentence_meaning_quality_gate_v1 import phase2_quality_report
        failed = phase2_quality_report()
        failed["passed"] = False
        with patch("languages.en.evaluation.sentence_phase2_acceptance_v1.phase2_quality_report",
                   return_value=failed):
            self.assertFalse(evaluate_phase2_acceptance()["engineering_acceptance_passed"])


if __name__ == "__main__":
    unittest.main()
