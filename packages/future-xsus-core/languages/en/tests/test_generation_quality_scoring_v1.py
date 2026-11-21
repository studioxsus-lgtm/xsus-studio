"""Exercise aggregate-only exact-match scoring on synthetic holdout generations."""
import json
import unittest
from copy import deepcopy
from languages.en.evaluation.generation_quality_scoring_v1 import (
    inspect_generation_quality_scoring_v1 as score,
)

def samples():
    return ["Amber", "Birch", "Cedar"], {
        "16":["", "Birch", ""],
        "32":["Amber", "Birch", "Cedar"],
        "64":["Amber", "", "Cedar"],
    }

class GenerationQualityScoringTests(unittest.TestCase):
    def evaluate(self, refs=None, outputs=None, **kwargs):
        original_refs, original_outputs=samples()
        return score(original_refs if refs is None else refs,
                     original_outputs if outputs is None else outputs,
                     independent_holdout=True, **kwargs)

    def test_counts_are_derived_from_generations(self):
        report=self.evaluate()
        self.assertEqual(report["windows"]["16"]["accepted_responses"],1)
        self.assertEqual(report["windows"]["16"]["empty_responses"],2)
        self.assertEqual(report["windows"]["32"]["accepted_responses"],3)
        self.assertEqual(report["windows"]["32"]["empty_responses"],0)

    def test_whitespace_trimmed_exact_match(self):
        refs,outputs=samples()
        outputs["32"][0]="  Amber  "
        self.assertEqual(self.evaluate(refs,outputs)["windows"]["32"]["accepted_responses"],3)

    def test_case_sensitive_not_semantic(self):
        refs,outputs=samples()
        outputs["32"][0]="amber"
        report=self.evaluate(refs,outputs)
        self.assertEqual(report["windows"]["32"]["accepted_responses"],2)
        self.assertFalse(report["semantic_correctness_proven"])

    def test_comparison_is_integrated(self):
        report=self.evaluate()
        self.assertEqual(report["comparison"]["comparisons"]["32"]["accepted_delta_vs_16"],2)
        self.assertFalse(report["comparison"]["quality_improvement_proven"])

    def test_no_release(self):
        report=self.evaluate()
        self.assertFalse(report["release_authorized"])
        self.assertFalse(report["comparison"]["training_authorized"])

    def test_raw_text_not_serialized(self):
        refs,outputs=samples()
        refs[0]="PRIVATE_REFERENCE_MARKER"
        outputs["32"][0]="PRIVATE_REFERENCE_MARKER"
        serialized=json.dumps(self.evaluate(refs,outputs))
        self.assertNotIn("PRIVATE_REFERENCE_MARKER",serialized)
        self.assertNotIn('"raw_text":',serialized)

    def test_missing_holdout_rejected(self):
        refs,outputs=samples()
        with self.assertRaises(ValueError): score(refs,outputs)

    def test_retraining_rejected(self):
        with self.assertRaises(ValueError): self.evaluate(weights_retrained=True)

    def test_empty_reference_rejected(self):
        refs,outputs=samples()
        refs[0]=" "
        with self.assertRaises(ValueError): self.evaluate(refs,outputs)

    def test_mismatched_generation_count_rejected(self):
        refs,outputs=samples()
        outputs["64"].pop()
        with self.assertRaises(ValueError): self.evaluate(refs,outputs)

    def test_nontext_generation_rejected(self):
        refs,outputs=samples()
        outputs["32"][1]=None
        with self.assertRaises(ValueError): self.evaluate(refs,outputs)

    def test_extra_window_rejected(self):
        refs,outputs=samples()
        outputs["128"]=[""]*3
        with self.assertRaises(ValueError): self.evaluate(refs,outputs)

    def test_inputs_unchanged(self):
        refs,outputs=samples()
        snapshot=deepcopy((refs,outputs))
        self.evaluate(refs,outputs)
        self.assertEqual((refs,outputs),snapshot)

    def test_deterministic_json(self):
        self.assertEqual(json.dumps(self.evaluate(),sort_keys=True),
                         json.dumps(self.evaluate(),sort_keys=True))

if __name__=="__main__":
    unittest.main()
