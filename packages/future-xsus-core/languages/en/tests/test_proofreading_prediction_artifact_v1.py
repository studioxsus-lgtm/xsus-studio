import copy
import unittest

from languages.en.evaluation.proofreading_regression_comparison_v1 import ProofreadingPredictionV1 as P
from languages.en.evaluation.proofreading_prediction_artifact_v1 import (
    create_proofreading_prediction_artifact_v1 as create,
    verify_proofreading_prediction_artifact_v1 as verify,
    compare_authenticated_proofreading_artifacts_v1 as compare,
)


class PredictionArtifactV1Tests(unittest.TestCase):
    def setUp(self):
        self.key = b"p" * 32
        self.dataset = "a" * 64
        self.ref = [P("a", "corrected", "A"), P("b", "unchanged", "B")]
        self.old = [P("a", "corrected", "A"), P("b", "unchanged", "wrong")]
        self.new = [P("a", "corrected", "A"), P("b", "unchanged", "B")]

    def artifact(self, version="v1", predictions=None):
        return create(version, self.dataset, self.ref if predictions is None else predictions, self.key)

    def compare(self, **kwargs):
        return compare(
            self.artifact("reference", self.ref), self.artifact("baseline", self.old),
            self.artifact("candidate", self.new), self.key, **kwargs
        )

    def test_round_trip(self):
        self.assertEqual(verify(self.artifact(), self.key), tuple(self.ref))

    def test_canonical_sort(self):
        self.assertEqual(verify(self.artifact(predictions=list(reversed(self.ref))), self.key), tuple(self.ref))

    def test_wrong_key(self):
        with self.assertRaises(ValueError):
            verify(self.artifact(), b"q"*32)

    def test_tampered_output(self):
        value = self.artifact()
        value["predictions"][0]["output"] = "tampered"
        with self.assertRaises(ValueError):
            verify(value, self.key)

    def test_tampered_status(self):
        value = self.artifact()
        value["predictions"][0]["status"] = "unchanged"
        with self.assertRaises(ValueError):
            verify(value, self.key)

    def test_tampered_version(self):
        value = self.artifact()
        value["version"] = "other"
        with self.assertRaises(ValueError):
            verify(value, self.key)

    def test_tampered_dataset(self):
        value = self.artifact()
        value["dataset_sha256"] = "b"*64
        with self.assertRaises(ValueError):
            verify(value, self.key)

    def test_unknown_field(self):
        value = self.artifact()
        value["extra"] = True
        with self.assertRaises(ValueError):
            verify(value, self.key)

    def test_invalid_signature(self):
        value = self.artifact()
        value["signature"] = "x"*64
        with self.assertRaises(ValueError):
            verify(value, self.key)

    def test_noncanonical_order(self):
        value = self.artifact()
        value["predictions"].reverse()
        with self.assertRaises(ValueError):
            verify(value, self.key)

    def test_duplicate_ids(self):
        with self.assertRaises(ValueError):
            self.artifact(predictions=[self.ref[0], self.ref[0]])

    def test_empty_predictions(self):
        with self.assertRaises(ValueError):
            self.artifact(predictions=[])

    def test_short_key(self):
        with self.assertRaises(ValueError):
            create("v1", self.dataset, self.ref, b"short")

    def test_invalid_version(self):
        with self.assertRaises(ValueError):
            self.artifact(version="../unsafe")

    def test_invalid_dataset(self):
        with self.assertRaises(ValueError):
            create("v1", "bad", self.ref, self.key)

    def test_comparison_passes(self):
        self.assertTrue(self.compare()["passed"])

    def test_comparison_improvement(self):
        self.assertEqual(self.compare()["improvements"], ["b"])

    def test_comparison_no_regressions(self):
        self.assertEqual(self.compare()["regressions"], [])

    def test_comparison_distinct_versions(self):
        with self.assertRaises(ValueError):
            compare(self.artifact("same", self.ref), self.artifact("same", self.old),
                    self.artifact("candidate", self.new), self.key)

    def test_comparison_dataset_mismatch(self):
        other = create("candidate", "b"*64, self.new, self.key)
        with self.assertRaises(ValueError):
            compare(self.artifact("reference", self.ref), self.artifact("baseline", self.old),
                    other, self.key)

    def test_no_release(self):
        self.assertFalse(self.compare()["release_authorized"])

    def test_no_model_execution_claim(self):
        self.assertFalse(self.compare()["model_execution_proven"])

    def test_no_publisher_identity_claim(self):
        self.assertFalse(self.compare()["publisher_identity_verified"])
