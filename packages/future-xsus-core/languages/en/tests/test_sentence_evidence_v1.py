"""Explicit-frame evidence grouping contracts."""
import unittest

from languages.en.text.understanding.sentence_evidence_v1 import analyze_sentence_evidence


class EvidenceGroupingTests(unittest.TestCase):
    def test_positive_and_negative_group(self):
        result = analyze_sentence_evidence([
            "She reads the report.", "She does not read the report.",
            "She reads the report.",
        ])
        self.assertEqual(result["group_count"], 1)
        self.assertEqual(result["explicit_polarity_conflict_groups"], 1)
        self.assertEqual(result["groups"][0]["positive_indices"], [0, 2])
        self.assertEqual(result["groups"][0]["negative_indices"], [1])
        self.assertFalse(result["groups"][0]["world_contradiction_proven"])

    def test_distinct_actions_and_objects(self):
        result = analyze_sentence_evidence([
            "She reads the report.", "She writes the report.",
            "She reads the document.",
        ])
        self.assertEqual(result["group_count"], 3)
        self.assertEqual(result["explicit_polarity_conflict_groups"], 0)

    def test_abstention_does_not_create_group(self):
        result = analyze_sentence_evidence([
            "She reads the report.", "She reads private records.",
        ])
        self.assertEqual(result["resolved_sentences"], 1)
        self.assertEqual(result["abstained_indices"], [1])
        self.assertEqual(result["group_count"], 1)
        self.assertNotIn("private records", repr(result))

    def test_no_world_or_coreference_claims(self):
        result = analyze_sentence_evidence(["She reads the report."])
        self.assertFalse(result["production_authorized"])
        self.assertFalse(result["world_truth_verified"])
        self.assertFalse(result["temporal_scope_resolved"])
        self.assertFalse(result["cross_sentence_coreference_proven"])

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            analyze_sentence_evidence([])

    def test_maximum_batch(self):
        result = analyze_sentence_evidence(["She reads the report."] * 32)
        self.assertEqual(result["resolved_sentences"], 32)
        self.assertEqual(result["group_count"], 1)


if __name__ == "__main__":
    unittest.main()
