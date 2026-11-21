"""Phase 3.4 role batch boundaries and structural results."""
import unittest

from languages.en.text.understanding.role_batch_v1 import (
    analyze_role_batch, compare_role_batch_pairs,
)


class RoleBatchTests(unittest.TestCase):
    def test_mixed_batch(self):
        result = analyze_role_batch(["She reads the report.", "She reads private records."])
        self.assertEqual((result.total, result.resolved, result.abstained), (2, 1, 1))
        self.assertEqual(result.roles[1]["status"], "abstained")
        self.assertNotIn("private records", repr(result))

    def test_pair_comparison(self):
        sentences = ["She reads the report.", "She does not read the report."]
        result = compare_role_batch_pairs(sentences, [(0, 1)])
        self.assertEqual(result["pairs"][0]["relation"], "same_roles_opposite_polarity")
        self.assertFalse(result["event_identity_proven"])
        self.assertFalse(result["production_authorized"])

    def test_empty_batch_rejected(self):
        with self.assertRaises(ValueError):
            analyze_role_batch([])

    def test_oversized_batch_rejected(self):
        with self.assertRaises(ValueError):
            analyze_role_batch(["She reads the report."] * 33)

    def test_oversized_sentence_rejected(self):
        with self.assertRaises(ValueError):
            analyze_role_batch(["x" * 1001])

    def test_oversized_total_rejected(self):
        with self.assertRaises(ValueError):
            analyze_role_batch(["x" * 300] * 28)

    def test_duplicate_pairs_rejected(self):
        with self.assertRaises(ValueError):
            compare_role_batch_pairs(["She reads the report.", "He reads the report."],
                                     [(0, 1), (0, 1)])

    def test_self_pair_rejected(self):
        with self.assertRaises(ValueError):
            compare_role_batch_pairs(["She reads the report."], [(0, 0)])

    def test_bool_index_rejected(self):
        with self.assertRaises(ValueError):
            compare_role_batch_pairs(["She reads the report.", "He reads the report."],
                                     [(True, 1)])

    def test_more_than_64_pairs_rejected(self):
        with self.assertRaises(ValueError):
            compare_role_batch_pairs(["She reads the report.", "He reads the report."],
                                     [(0, 1)] * 65)


if __name__ == "__main__":
    unittest.main()
