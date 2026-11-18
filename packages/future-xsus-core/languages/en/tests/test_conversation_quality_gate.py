import tomllib
import unittest
from pathlib import Path

from languages.en.data.preparation.corpus import load_corpus, validate_splits
from languages.en.evaluation.compare import compare_checkpoint, load_cases

LANGUAGE_ROOT = Path(__file__).resolve().parents[1]


class ConversationQualityGateTests(unittest.TestCase):
    def test_v3_meets_published_scores_on_both_held_out_sets(self):
        manifest_path = LANGUAGE_ROOT / "models" / "manifests" / "conversation-v3.toml"
        with manifest_path.open("rb") as source:
            manifest = tomllib.load(source)
        checkpoint = LANGUAGE_ROOT / manifest["checkpoint"]
        training = load_corpus(LANGUAGE_ROOT / "data" / "training-v3.jsonl")

        for dataset in ("evaluation", "regression"):
            expected = manifest[dataset]
            with self.subTest(dataset=dataset):
                cases = load_cases(LANGUAGE_ROOT / expected["benchmark"])
                validate_splits(training, tuple(case.example for case in cases))
                actual = compare_checkpoint(checkpoint, cases)
                self.assertEqual(actual["revision"], "sha256-" + manifest["sha256"])
                self.assertEqual(actual["cases"], expected["cases"])
                self.assertEqual(actual["fact_cases"], expected["fact_cases"])
                for metric in ("accepted", "preserved_all_facts", "exact_matches"):
                    if metric in expected:
                        self.assertGreaterEqual(actual[metric], expected[metric], metric)
