"""Evidence grouping diagnostic regression."""
import unittest
from languages.en.evaluation.sentence_evidence_benchmark_v1 import evaluate_sentence_evidence


class EvidenceBenchmarkTests(unittest.TestCase):
    def test_authored_cases(self):
        result = evaluate_sentence_evidence()
        self.assertEqual(result["cases"], 8)
        self.assertEqual(result["failures"], 0)
        self.assertTrue(result["passed"])

    def test_does_not_claim_world_truth_or_production(self):
        result = evaluate_sentence_evidence()
        self.assertFalse(result["production_authorized"])
        self.assertFalse(result["independent_external_holdout_proven"])
        self.assertFalse(result["raw_text_exposed"])


if __name__ == "__main__":
    unittest.main()
