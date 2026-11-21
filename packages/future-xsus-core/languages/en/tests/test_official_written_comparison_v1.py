import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from languages.en.evaluation.official_written_comparison_v1 import (
    compare_official_written_benchmarks_v1 as compare,
    _OFFICIAL,
)


class OfficialWrittenComparisonV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root=Path(self.tmp.name)
        self.baseline=root/"baseline.gz"
        self.candidate=root/"candidate.gz"
        self.baseline.write_bytes(b"baseline")
        self.candidate.write_bytes(b"candidate")

    def test_official_paths(self):
        self.assertEqual({p.name for p in _OFFICIAL.values()},
                         {"quality-v4.jsonl","quality-v5.jsonl"})

    def test_official_benchmarks_exist(self):
        self.assertTrue(all(p.is_file() for p in _OFFICIAL.values()))

    def test_distinct_paths_required(self):
        with self.assertRaises(ValueError):
            compare(self.baseline,self.baseline)

    def test_missing_checkpoint(self):
        self.candidate.unlink()
        with self.assertRaises(ValueError):
            compare(self.baseline,self.candidate)

    def test_invalid_type(self):
        with self.assertRaises(ValueError):
            compare("baseline",self.candidate)

    def _compare(self,baseline_accepted=1,candidate_accepted=2):
        def fake_checkpoint(path,cases):
            return {"cases":len(cases),
                    "accepted":baseline_accepted if path==self.baseline else candidate_accepted,
                    "exact_matches":0,"preserved_all_facts":0}
        with patch("languages.en.evaluation.official_written_comparison_v1.compare_checkpoint",
                   side_effect=fake_checkpoint):
            return compare(self.baseline,self.candidate)

    def test_both_benchmarks(self):
        self.assertEqual(set(self._compare()["benchmarks"]),{"written-v4","written-v5"})

    def test_counts_are_positive(self):
        self.assertTrue(all(row["cases"]>0 for row in self._compare()["benchmarks"].values()))

    def test_deltas(self):
        self.assertTrue(all(row["delta_accepted"]==1 for row in self._compare()["benchmarks"].values()))

    def test_regression(self):
        self.assertTrue(self._compare(2,1)["benchmark_regression_detected"])

    def test_no_regression(self):
        self.assertFalse(self._compare(1,2)["benchmark_regression_detected"])

    def test_no_automatic_approval(self):
        self.assertFalse(self._compare()["candidate_automatically_approved"])

    def test_no_deployment(self):
        self.assertFalse(self._compare()["production_deployed"])

    def test_human_release(self):
        self.assertTrue(self._compare()["human_release_required"])

    def test_sha256(self):
        self.assertTrue(all(len(row["benchmark_sha256"])==64
                            for row in self._compare()["benchmarks"].values()))

    def test_mismatched_case_count(self):
        with patch("languages.en.evaluation.official_written_comparison_v1.compare_checkpoint",
                   return_value={"cases":0,"accepted":0,"exact_matches":0,"preserved_all_facts":0}):
            with self.assertRaises(ValueError):
                compare(self.baseline,self.candidate)
