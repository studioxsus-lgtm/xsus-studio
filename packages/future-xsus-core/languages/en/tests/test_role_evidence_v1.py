"""Phase 3.4 role evidence regression."""
import unittest

from languages.en.text.understanding.role_evidence_v1 import group_role_evidence


class RoleEvidenceTests(unittest.TestCase):
    def test_positive_and_negative_group(self):
        result = group_role_evidence([
            "She reads the report.", "She does not read the report.",
            "She reads the report.",
        ])
        self.assertEqual(len(result["groups"]), 1)
        group = result["groups"][0]
        self.assertEqual(group["positive_indices"], (0, 2))
        self.assertEqual(group["negative_indices"], (1,))
        self.assertTrue(group["explicit_polarity_difference"])

    def test_different_subjects_do_not_merge(self):
        result = group_role_evidence(["She reads the report.", "He reads the report."])
        self.assertEqual(len(result["groups"]), 2)

    def test_unsupported_abstains_without_raw_echo(self):
        result = group_role_evidence(["She reads private records.", "She reads the report."])
        self.assertEqual(result["abstained_indices"], (0,))
        self.assertNotIn("private records", repr(result))

    def test_scope(self):
        result = group_role_evidence(["She reads the report."])
        self.assertFalse(result["raw_text_exposed"])
        self.assertFalse(result["event_identity_proven"])
        self.assertFalse(result["logical_contradiction_proven"])
        self.assertFalse(result["production_authorized"])


if __name__ == "__main__":
    unittest.main()
