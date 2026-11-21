import unittest
from languages.en.evaluation.proofreading_category_quality_v1 import CategoryCaseV1
from languages.en.evaluation.proofreading_category_manifest_v1 import (
    create_proofreading_category_manifest_v1 as create,
    verify_proofreading_category_manifest_v1 as verify,
    evaluate_signed_proofreading_categories_v1 as evaluate,
)


class CategoryManifestV1Tests(unittest.TestCase):
    def setUp(self):
        self.key = b"m" * 32
        self.digest = "a" * 64
        self.categories = [CategoryCaseV1("b", "correct_text"), CategoryCaseV1("a", "agreement")]

    def manifest(self):
        return create(self.digest, self.categories, self.key)

    def test_roundtrip(self):
        self.assertEqual(len(verify(self.manifest(), self.key)), 2)

    def test_canonical_order(self):
        self.assertEqual(verify(self.manifest(), self.key)[0].case_id, "a")

    def test_order_independent_signature(self):
        first = self.manifest()["signature"]
        second = create(self.digest, list(reversed(self.categories)), self.key)["signature"]
        self.assertEqual(first, second)

    def test_wrong_key(self):
        with self.assertRaises(ValueError):
            verify(self.manifest(), b"x"*32)

    def test_modified_category(self):
        item = self.manifest()
        item["assignments"][0]["category"] = "changed"
        with self.assertRaises(ValueError):
            verify(item, self.key)

    def test_modified_case_id(self):
        item = self.manifest()
        item["assignments"][0]["case_id"] = "other"
        with self.assertRaises(ValueError):
            verify(item, self.key)

    def test_modified_digest(self):
        item = self.manifest()
        item["dataset_sha256"] = "b"*64
        with self.assertRaises(ValueError):
            verify(item, self.key)

    def test_modified_signature(self):
        item = self.manifest()
        item["signature"] = "b"*64
        with self.assertRaises(ValueError):
            verify(item, self.key)

    def test_reordered_assignments_rejected(self):
        item = self.manifest()
        item["assignments"].reverse()
        with self.assertRaises(ValueError):
            verify(item, self.key)

    def test_duplicate_id(self):
        with self.assertRaises(ValueError):
            create(self.digest, [self.categories[0]]*2, self.key)

    def test_empty(self):
        with self.assertRaises(ValueError):
            create(self.digest, [], self.key)

    def test_invalid_category(self):
        with self.assertRaises(ValueError):
            create(self.digest, [CategoryCaseV1("a", "Invalid Label")], self.key)

    def test_short_key(self):
        with self.assertRaises(ValueError):
            create(self.digest, self.categories, b"short")

    def test_invalid_digest(self):
        with self.assertRaises(ValueError):
            create("invalid", self.categories, self.key)

    def test_unknown_field(self):
        item = self.manifest()
        item["extra"] = True
        with self.assertRaises(ValueError):
            verify(item, self.key)

    def test_no_release(self):
        self.assertFalse(self.manifest()["release_authorized"])

    def test_manifest_mismatch_rejected(self):
        with self.assertRaises(ValueError):
            evaluate({}, self.manifest(), self.key)

    def test_invalid_assignments_rejected(self):
        item = self.manifest()
        item["assignments"] = ["bad"]
        with self.assertRaises(ValueError):
            verify(item, self.key)

    def test_boolean_release_rejected(self):
        item = self.manifest()
        item["release_authorized"] = True
        with self.assertRaises(ValueError):
            verify(item, self.key)

    def test_signed_category_report(self):
        predictions = [{"case_id": "a", "status": "corrected", "output": "A"},
                       {"case_id": "b", "status": "unchanged", "output": "B"}]
        report = {
            "contract": "future-xsus-core.proofreading-snapshot-comparison.v1",
            "trusted_digest_checked": True, "single_snapshot_used": True,
            "artifacts_authenticated_at_check": True,
            "reference_artifact": {"dataset_sha256": self.digest, "predictions": predictions},
            "baseline_artifact": {"dataset_sha256": self.digest, "predictions": predictions},
            "candidate_artifact": {"dataset_sha256": self.digest, "predictions": predictions},
            "regressions": [],
        }
        result = evaluate(report, self.manifest(), self.key)
        self.assertTrue(result["category_manifest_authenticated_at_check"])
        self.assertFalse(result["release_authorized"])
