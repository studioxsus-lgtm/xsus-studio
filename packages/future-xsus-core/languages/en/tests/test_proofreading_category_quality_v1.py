import json
from hashlib import sha256
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest

from languages.en.evaluation.proofreading_snapshot_comparison_v1 import compare_proofreading_snapshot_v1
from languages.en.evaluation.proofreading_category_quality_v1 import (
    CategoryCaseV1, CategoryThresholdV1, evaluate_proofreading_categories_v1,
)


class CategoryQualityV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name)/"data.jsonl"
        self.rows = [
            {"id": "a", "input": "I is ready.", "status": "corrected", "output": "I am ready."},
            {"id": "b", "input": "She go home.", "status": "corrected", "output": "She goes home."},
            {"id": "c", "input": "The files are ready.", "status": "unchanged", "output": "The files are ready."},
            {"id": "d", "input": "We are ready.", "status": "unchanged", "output": "We are ready."},
        ]
        self.path.write_text("".join(json.dumps(x)+"\n" for x in self.rows))
        def correct(text):
            mapping = {"I is ready.": "I am ready.", "She go home.": "She goes home."}
            if text in mapping:
                return SimpleNamespace(status="corrected", text=mapping[text])
            return SimpleNamespace(status="unchanged", text=text)
        def unchanged(text):
            return SimpleNamespace(status="unchanged", text=text)
        self.report = compare_proofreading_snapshot_v1(
            self.path, sha256(self.path.read_bytes()).hexdigest(), b"k"*32,
            baseline_engine=unchanged, candidate_engine=correct,
        )
        self.groups = [CategoryCaseV1("a", "agreement"), CategoryCaseV1("b", "agreement"),
                       CategoryCaseV1("c", "correct_text"), CategoryCaseV1("d", "correct_text")]

    def evaluate(self, **kwargs):
        return evaluate_proofreading_categories_v1(self.report, self.groups, **kwargs)

    def test_pass(self):
        self.assertTrue(self.evaluate()["passed"])

    def test_categories(self):
        self.assertEqual(set(self.evaluate()["categories"]), {"agreement", "correct_text"})

    def test_agreement_accuracy(self):
        self.assertEqual(self.evaluate()["categories"]["agreement"]["accuracy"], 1.0)

    def test_correct_text_accuracy(self):
        self.assertEqual(self.evaluate()["categories"]["correct_text"]["accuracy"], 1.0)

    def test_missing_case(self):
        with self.assertRaises(ValueError):
            evaluate_proofreading_categories_v1(self.report, self.groups[:-1])

    def test_duplicate_case(self):
        with self.assertRaises(ValueError):
            evaluate_proofreading_categories_v1(self.report, self.groups+[self.groups[0]])

    def test_invalid_category(self):
        with self.assertRaises(ValueError):
            evaluate_proofreading_categories_v1(self.report, [CategoryCaseV1("a", "")]+self.groups[1:])

    def test_wrong_report(self):
        with self.assertRaises(ValueError):
            evaluate_proofreading_categories_v1({}, self.groups)

    def test_missing_verification_flag(self):
        report = {**self.report, "trusted_digest_checked": False}
        with self.assertRaises(ValueError):
            evaluate_proofreading_categories_v1(report, self.groups)

    def test_min_cases(self):
        self.assertFalse(self.evaluate(default_threshold=CategoryThresholdV1(min_cases=3))["passed"])

    def test_high_accuracy(self):
        self.assertTrue(self.evaluate(default_threshold=CategoryThresholdV1(min_accuracy=1))["passed"])

    def test_threshold_override(self):
        self.assertFalse(self.evaluate(thresholds={"agreement": CategoryThresholdV1(min_cases=3)})["passed"])

    def test_invalid_threshold(self):
        with self.assertRaises(ValueError):
            self.evaluate(default_threshold=CategoryThresholdV1(min_accuracy=2))

    def test_boolean_threshold(self):
        with self.assertRaises(ValueError):
            self.evaluate(default_threshold=CategoryThresholdV1(min_cases=True))

    def test_invalid_threshold_map(self):
        with self.assertRaises(ValueError):
            self.evaluate(thresholds=[])

    def test_regression_gate(self):
        self.report["regressions"] = ["a"]
        self.assertFalse(self.evaluate()["passed"])

    def test_no_release(self):
        self.assertFalse(self.evaluate()["release_authorized"])

    def test_category_labels_not_authenticated(self):
        self.assertFalse(self.evaluate()["category_labels_authenticated"])

    def test_no_general_accuracy(self):
        self.assertFalse(self.evaluate()["general_language_accuracy_verified"])

    def test_missing_predictions(self):
        report = {**self.report, "candidate_artifact": {}}
        with self.assertRaises(ValueError):
            evaluate_proofreading_categories_v1(report, self.groups)
