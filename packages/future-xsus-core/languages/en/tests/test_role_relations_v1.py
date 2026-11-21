"""Phase 3.3 role relation contract tests."""
import unittest
from languages.en.text.understanding.role_relations_v1 import (
    compare_sentence_roles, role_relation_dict,
)


class RoleRelationsTests(unittest.TestCase):
    def test_identical_explicit_roles(self):
        result = compare_sentence_roles("She reads the report.", "She reads the report.")
        self.assertEqual(result.relation, "same_explicit_roles")

    def test_opposite_explicit_polarity(self):
        result = compare_sentence_roles("She reads the report.", "She does not read the report.")
        self.assertEqual(result.relation, "same_roles_opposite_polarity")

    def test_different_subject(self):
        result = compare_sentence_roles("She reads the report.", "He reads the report.")
        self.assertEqual(result.relation, "different_subject")

    def test_different_action(self):
        result = compare_sentence_roles("She reads the report.", "She writes the report.")
        self.assertEqual(result.relation, "different_action")

    def test_different_object(self):
        result = compare_sentence_roles("She reads the report.", "She reads the document.")
        self.assertEqual(result.relation, "different_object")

    def test_abstention(self):
        result = compare_sentence_roles("She reads private records.", "She reads the report.")
        self.assertEqual(result.status, "abstained")
        self.assertIsNone(result.relation)

    def test_no_event_identity_or_contradiction_claim(self):
        result = role_relation_dict("She reads the report.", "She reads the report.")
        self.assertFalse(result["event_identity_proven"])
        self.assertFalse(result["logical_contradiction_proven"])
        self.assertFalse(result["production_authorized"])


if __name__ == "__main__":
    unittest.main()
