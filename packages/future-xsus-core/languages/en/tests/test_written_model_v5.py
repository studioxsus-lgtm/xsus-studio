import tomllib
import unittest
from pathlib import Path

from core.contracts.request import Conversation
from languages.en.data.preparation.build_written_v5 import build_artifacts
from languages.en.data.preparation.corpus import load_corpus, validate_splits
from languages.en.evaluation.compare import compare_checkpoint, load_cases
from languages.en.models.profiles import load_profile
from languages.en.text.normalization.model_input import WRITTEN_V5, prepare_model_input

_ROOT = Path(__file__).resolve().parents[1]


class WrittenEnglishV5Tests(unittest.TestCase):
    def test_reproducible_corpus_has_disjoint_evaluations_and_covers_24_new_topics(self):
        for name, content in build_artifacts().items():
            self.assertEqual((_ROOT / name).read_text(encoding="utf-8"), content, name)
        training = load_corpus(_ROOT / "data/training-v5.jsonl")
        self.assertEqual(len(training), 2573)
        for version in ("v2", "v3", "v4", "v5"):
            cases = load_corpus(_ROOT / f"evaluation/quality-{version}.jsonl")
            validate_splits(training, cases)
        written_training = training[413:]
        train_topics = {prepare_model_input(case.conversation, WRITTEN_V5)[0].text for case in written_training}
        self.assertEqual(len(written_training), 2160)
        self.assertEqual(len(train_topics), 24)
        written_cases = load_corpus(_ROOT / "evaluation/quality-v5.jsonl")
        prepared = [prepare_model_input(case.conversation, WRITTEN_V5)[0].text for case in written_cases]
        self.assertEqual(len(prepared), 72)
        self.assertEqual(len(set(prepared)), 24)
        self.assertTrue(all(text.startswith("Explain writing lesson: ") for text in prepared))
        self.assertEqual(set(prepared), train_topics)

    def test_topic_match_does_not_redirect_negated_or_multi_topic_prompts(self):
        for prompt in (
            "Please don't explain compound adjectives.",
            "Explain compound adjectives and dangling modifiers.",
            "Make this polite: Please explain compound adjectives.",
        ):
            original = Conversation(prompt)
            prepared, _ = prepare_model_input(original, WRITTEN_V5)
            self.assertFalse(prepared.text.startswith("Explain writing lesson:"), prompt)

    def test_v5_reproduces_published_lesson_and_regression_scores(self):
        _, model, revision = load_profile("written-v5")
        manifest = tomllib.loads((_ROOT / "models/manifests/written-v5.toml").read_text(encoding="utf-8"))
        self.assertEqual(model.prompt_format, WRITTEN_V5)
        self.assertEqual(revision, "sha256-" + manifest["sha256"])
        for section in manifest["benchmarks"].values():
            with self.subTest(file=section["file"]):
                cases = load_cases(_ROOT / section["file"])
                scores = compare_checkpoint(_ROOT / manifest["checkpoint"], cases)
                self.assertEqual(scores["cases"], section["cases"])
                self.assertEqual(scores["accepted"], section["accepted"])
                self.assertEqual(scores["preserved_all_facts"], scores["fact_cases"])
