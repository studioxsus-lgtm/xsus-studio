import hashlib
import json
import tomllib
import unittest
from pathlib import Path

from languages.en.data.preparation.corpus import load_corpus, validate_splits
from languages.en.data.preparation.expand_corpus import build_v3_rows
from languages.en.data.preparation.written_corpus import build_written_rows
from languages.en.evaluation.compare import compare_checkpoint, load_cases
from languages.en.models.profiles import load_profile
from languages.en.text.normalization.model_input import WRITTEN_V4

_ROOT = Path(__file__).resolve().parents[1]


class WrittenEnglishV4Tests(unittest.TestCase):
    def test_corpus_is_reproducible_and_separate_from_all_benchmarks(self):
        source = _ROOT / "data" / "training-v4.jsonl"
        actual = [json.loads(line) for line in source.read_text(encoding="utf-8").splitlines()]
        expected = build_v3_rows(_ROOT / "data" / "training.jsonl") + build_written_rows()
        self.assertEqual(actual, expected)
        manifest = tomllib.loads((_ROOT / "data" / "manifests" / "corpus-v4.toml").read_text(encoding="utf-8"))
        self.assertEqual(len(actual), manifest["training_examples"])
        self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), manifest["sha256"])
        training = load_corpus(source)
        for suite in ("v2", "v3", "v4"):
            validate_splits(training, load_corpus(_ROOT / "evaluation" / f"quality-{suite}.jsonl"))

    def test_checkpoint_reproduces_documented_results(self):
        _, model, revision = load_profile("written-v4")
        self.assertEqual(model.prompt_format, WRITTEN_V4)
        manifest = tomllib.loads((_ROOT / "models" / "manifests" / "written-v4.toml").read_text(encoding="utf-8"))
        self.assertEqual(revision, "sha256-" + manifest["sha256"])
        for suite, expected in manifest["benchmarks"].items():
            with self.subTest(suite=suite):
                cases = load_cases(_ROOT / expected["file"])
                actual = compare_checkpoint(_ROOT / manifest["checkpoint"], cases)
                for field in ("cases", "accepted", "fact_cases", "preserved_all_facts"):
                    self.assertEqual(actual[field], expected[field], field)
