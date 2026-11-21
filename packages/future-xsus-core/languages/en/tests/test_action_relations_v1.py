"""Phase 3 action relation comparison regression."""
import unittest

from languages.en.text.understanding.action_relations_v1 import (
    action_relation_dict, compare_action_semantics,
)


class ActionRelationsTests(unittest.TestCase):
    def test_same_action(self):
        result = compare_action_semantics("She reads the report.", "He reads the document.")
        self.assertEqual(result.relation, "same_explicit_action")

    def test_same_action_different_polarity(self):
        result = compare_action_semantics("She reads the report.", "She does not read the report.")
        self.assertEqual(result.relation, "same_action_different_polarity")

    def test_same_category_distinct_action(self):
        result = compare_action_semantics("She reads the report.", "He reviews the document.")
        self.assertEqual(result.relation, "same_action_category")
        self.assertFalse(result.same_action)

    def test_same_category_different_polarity(self):
        result = compare_action_semantics("She reads the report.", "He does not review the document.")
        self.assertEqual(result.relation, "same_category_different_polarity")

    def test_different_category(self):
        result = compare_action_semantics("She reads the report.", "She writes the report.")
        self.assertEqual(result.relation, "different_action_categories")

    def test_unsupported_abstains(self):
        result = compare_action_semantics("She reads private records.", "She reads the report.")
        self.assertEqual(result.status, "abstained")
        self.assertIsNone(result.relation)

    def test_no_entailment_claim(self):
        result = action_relation_dict("She reads the report.", "She reads the report.")
        self.assertFalse(result["logical_entailment_proven"])
        self.assertFalse(result["world_truth_verified"])
        self.assertFalse(result["production_authorized"])


if __name__ == "__main__":
    unittest.main()
