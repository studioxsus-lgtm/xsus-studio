import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from languages.en.evaluation.official_written_evidence_v1 import create_official_written_evidence_v1 as evidence


def comparison():
    rows={}
    for name in ("written-v4","written-v5"):
        rows[name]={"cases":2,"benchmark_sha256":"a"*64,
                    "baseline":{"accepted":1,"exact_matches":0,"preserved_all_facts":1},
                    "candidate":{"accepted":2,"exact_matches":1,"preserved_all_facts":1},
                    "delta_accepted":1,"delta_exact_matches":1,"delta_preserved_all_facts":0}
    return {"contract":"future-xsus-core.official-written-comparison.v1",
            "benchmarks":rows,"benchmark_regression_detected":False,
            "candidate_automatically_approved":False,"human_release_required":True,
            "production_deployed":False}


class OfficialWrittenEvidenceV1Tests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root=Path(self.temp.name)
        self.baseline=root/"baseline.gz"
        self.candidate=root/"candidate.gz"
        self.baseline.write_bytes(b"baseline")
        self.candidate.write_bytes(b"candidate")

    def _run(self):
        with patch("languages.en.evaluation.official_written_evidence_v1.compare_official_written_benchmarks_v1",
                   return_value=comparison()):
            return evidence(self.baseline,self.candidate)

    def test_contract(self):
        self.assertEqual(self._run()["contract"],"future-xsus-core.official-written-evidence.v1")

    def test_baseline_hash(self):
        self.assertEqual(len(self._run()["checkpoint_sha256"]["baseline"]),64)

    def test_candidate_hash(self):
        self.assertEqual(len(self._run()["checkpoint_sha256"]["candidate"]),64)

    def test_hashes_distinct(self):
        row=self._run()["checkpoint_sha256"]
        self.assertNotEqual(row["baseline"],row["candidate"])

    def test_assessment(self):
        self.assertEqual(self._run()["assessment"]["acceptance_delta"],2)

    def test_both_benchmarks(self):
        self.assertEqual(len(self._run()["comparison"]["benchmarks"]),2)

    def test_no_release(self):
        self.assertFalse(self._run()["release_authorized"])

    def test_no_deployment(self):
        self.assertFalse(self._run()["production_deployed"])

    def test_no_provenance_claim(self):
        self.assertFalse(self._run()["independent_provenance_authenticated"])

    def test_unchanged(self):
        self.assertTrue(self._run()["input_checkpoints_unchanged"])

    def test_does_not_write(self):
        self._run()
        self.assertEqual(self.baseline.read_bytes(),b"baseline")

    def test_same_path_rejected(self):
        with self.assertRaises(ValueError):
            evidence(self.baseline,self.baseline)

    def test_bad_type(self):
        with self.assertRaises(ValueError):
            evidence("baseline",self.candidate)

    def test_missing_checkpoint(self):
        self.candidate.unlink()
        with self.assertRaises(FileNotFoundError):
            evidence(self.baseline,self.candidate)

    def test_changed_during_evaluation(self):
        def mutate(*args):
            self.candidate.write_bytes(b"modified")
            return comparison()
        with patch("languages.en.evaluation.official_written_evidence_v1.compare_official_written_benchmarks_v1",
                   side_effect=mutate):
            with self.assertRaises(RuntimeError):
                evidence(self.baseline,self.candidate)

    def test_invalid_comparison_rejected(self):
        with patch("languages.en.evaluation.official_written_evidence_v1.compare_official_written_benchmarks_v1",
                   return_value={}):
            with self.assertRaises(ValueError):
                evidence(self.baseline,self.candidate)
