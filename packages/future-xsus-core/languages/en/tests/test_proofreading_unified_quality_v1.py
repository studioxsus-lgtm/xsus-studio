import json
from hashlib import sha256
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest

from languages.en.evaluation.proofreading_snapshot_comparison_v1 import compare_proofreading_snapshot_v1
from languages.en.evaluation.proofreading_category_quality_v1 import CategoryCaseV1, CategoryThresholdV1
from languages.en.evaluation.proofreading_category_manifest_v1 import create_proofreading_category_manifest_v1
from languages.en.evaluation.proofreading_unified_quality_v1 import evaluate_proofreading_unified_quality_v1


class UnifiedQualityV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / "data.jsonl"
        self.key = b"q" * 32
        rows = [
            {"id":"a","input":"I is ready.","status":"corrected","output":"I am ready."},
            {"id":"b","input":"We are ready.","status":"unchanged","output":"We are ready."},
        ]
        self.path.write_text("".join(json.dumps(r)+"\n" for r in rows))
        digest = sha256(self.path.read_bytes()).hexdigest()
        def baseline(text):
            return SimpleNamespace(status="unchanged",text=text)
        def candidate(text):
            return SimpleNamespace(status="corrected",text="I am ready.") if text=="I is ready." else baseline(text)
        self.report = compare_proofreading_snapshot_v1(
            self.path,digest,self.key,baseline_engine=baseline,candidate_engine=candidate
        )
        self.manifest = create_proofreading_category_manifest_v1(
            digest,[CategoryCaseV1("a","agreement"),CategoryCaseV1("b","preservation")],self.key
        )

    def evaluate(self, **kwargs):
        return evaluate_proofreading_unified_quality_v1(
            self.report,self.manifest,self.key,
            default_threshold=CategoryThresholdV1(min_cases=1),**kwargs
        )

    def test_pass(self):
        self.assertTrue(self.evaluate()["passed"])

    def test_improvement(self):
        self.assertEqual(self.evaluate()["improvements"],["a"])

    def test_accuracy(self):
        self.assertEqual(self.evaluate()["candidate_accuracy"],1.0)

    def test_two_categories(self):
        self.assertEqual(len(self.evaluate()["categories"]),2)

    def test_no_release(self):
        self.assertFalse(self.evaluate()["release_authorized"])

    def test_authentication_flags(self):
        self.assertTrue(self.evaluate()["artifacts_authenticated_at_check"])
        self.assertTrue(self.evaluate()["category_manifest_authenticated_at_check"])

    def test_no_attestation(self):
        self.assertFalse(self.evaluate()["model_execution_attested"])

    def test_category_min_cases_fail(self):
        self.assertFalse(evaluate_proofreading_unified_quality_v1(
            self.report,self.manifest,self.key
        )["passed"])

    def test_min_improvements(self):
        self.assertFalse(self.evaluate(min_improvements=2)["passed"])

    def test_tampered_prediction(self):
        self.report["candidate_artifact"]["predictions"][0]["output"]="tampered"
        with self.assertRaises(ValueError):
            self.evaluate()

    def test_tampered_manifest(self):
        self.manifest["assignments"][0]["category"]="other"
        with self.assertRaises(ValueError):
            self.evaluate()

    def test_wrong_key(self):
        with self.assertRaises(ValueError):
            evaluate_proofreading_unified_quality_v1(self.report,self.manifest,b"x"*32)

    def test_wrong_digest(self):
        self.manifest["dataset_sha256"]="b"*64
        with self.assertRaises(ValueError):
            self.evaluate()

    def test_ignore_forged_accuracy(self):
        self.report["candidate_accuracy"]=0.0
        self.assertEqual(self.evaluate()["candidate_accuracy"],1.0)

    def test_ignore_forged_regressions(self):
        self.report["regressions"]=["a"]
        self.assertEqual(self.evaluate()["regressions"],[])

    def test_reject_untrusted_report(self):
        self.report["trusted_digest_checked"]=False
        with self.assertRaises(ValueError):
            self.evaluate()

    def test_reject_wrong_contract(self):
        self.report["contract"]="invalid"
        with self.assertRaises(ValueError):
            self.evaluate()

    def test_category_accuracy_threshold(self):
        self.assertTrue(self.evaluate(thresholds={"agreement":CategoryThresholdV1(min_cases=1,min_accuracy=1.0)})["passed"])

    def test_missing_category(self):
        self.manifest=create_proofreading_category_manifest_v1(
            self.manifest["dataset_sha256"],[CategoryCaseV1("a","agreement")],self.key
        )
        with self.assertRaises(ValueError):
            self.evaluate()

    def test_missing_artifact(self):
        del self.report["candidate_artifact"]
        with self.assertRaises(KeyError):
            self.evaluate()
