import json
import unittest
from languages.en.evaluation.document_benchmark_v6 import DocumentCaseV6
from languages.en.evaluation.document_challenge_v6 import (
    CHALLENGE_GROUPS_V6, ChallengeGroupV6, evaluate_challenges_v6,
)


class DocumentChallengeV6Tests(unittest.TestCase):
    def test_group_count(self):
        self.assertEqual(len(evaluate_challenges_v6()["groups"]), 4)

    def test_case_count(self):
        self.assertEqual(evaluate_challenges_v6()["total_cases"], 12)

    def test_group_names(self):
        self.assertEqual([g["group"] for g in evaluate_challenges_v6()["groups"]],
                         [g.name for g in CHALLENGE_GROUPS_V6])

    def test_accuracy_on_gold_cases(self):
        self.assertEqual(evaluate_challenges_v6()["weighted_accuracy"], 1.0)

    def test_field_accuracy_present(self):
        for group in evaluate_challenges_v6()["groups"]:
            self.assertEqual(len(group["field_accuracy"]), 4)

    def test_no_semantic_claim(self):
        self.assertFalse(evaluate_challenges_v6()["evaluates_semantics"])

    def test_no_generalization_claim(self):
        self.assertFalse(evaluate_challenges_v6()["generalizes_to_unseen_text"])

    def test_json_serializable(self):
        json.dumps(evaluate_challenges_v6())

    def test_deterministic(self):
        self.assertEqual(evaluate_challenges_v6(), evaluate_challenges_v6())

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            evaluate_challenges_v6(())

    def test_wrong_group_type(self):
        with self.assertRaises(ValueError):
            evaluate_challenges_v6(("bad",))

    def test_duplicate_group_rejected(self):
        with self.assertRaises(ValueError):
            evaluate_challenges_v6((CHALLENGE_GROUPS_V6[0], CHALLENGE_GROUPS_V6[0]))

    def test_duplicate_case_rejected(self):
        case = DocumentCaseV6("same", "Alpha.", 1, 1, False, False)
        groups = (ChallengeGroupV6("a", (case,)), ChallengeGroupV6("b", (case,)))
        with self.assertRaises(ValueError):
            evaluate_challenges_v6(groups)

    def test_empty_group_rejected(self):
        with self.assertRaises(ValueError):
            evaluate_challenges_v6((ChallengeGroupV6("empty", ()),))

    def test_failure_count_per_field(self):
        case = DocumentCaseV6("wrong", "The report arrived.", 2, 1, False, False)
        report = evaluate_challenges_v6((ChallengeGroupV6("custom", (case,)),))
        self.assertEqual(report["groups"][0]["failures_by_field"]["paragraph_count"], 1)

    def test_failure_details_preserved(self):
        case = DocumentCaseV6("wrong", "The report arrived.", 2, 1, False, False)
        report = evaluate_challenges_v6((ChallengeGroupV6("custom", (case,)),))
        self.assertEqual(report["groups"][0]["failures"][0]["case"], "wrong")

    def test_weighted_accuracy_unequal_groups(self):
        good = DocumentCaseV6("good", "Alpha.", 1, 1, False, False)
        bad = DocumentCaseV6("bad", "Alpha.", 2, 1, False, False)
        groups = (ChallengeGroupV6("one", (good,)),
                  ChallengeGroupV6("two", (bad, good.__class__("good2", "Alpha.", 1, 1, False, False))))
        self.assertAlmostEqual(evaluate_challenges_v6(groups)["weighted_accuracy"], 11 / 12)

    def test_input_groups_unchanged(self):
        before = CHALLENGE_GROUPS_V6
        evaluate_challenges_v6()
        self.assertEqual(before, CHALLENGE_GROUPS_V6)
