import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from languages.en.models.checkpoint import load_checkpoint, save_checkpoint
from languages.en.models.neural_model import NeuralLanguageModel
from languages.en.models.registry import EnglishModelRegistry, _BASELINE
from languages.en.text.tokenizer import BytePairTokenizer


class EnglishModelRegistryTests(unittest.TestCase):
    @staticmethod
    def _candidate(
        root: Path, name: str, seed: int, *, baseline_path: Path | None = None,
    ) -> tuple[Path, Path, str]:
        if baseline_path is None:
            tokenizer = BytePairTokenizer()
            model = NeuralLanguageModel.initialize(
                vocab_size=tokenizer.vocab_size, hidden_size=4, context_size=8, seed=seed,
            )
            baseline_revision = load_checkpoint(_BASELINE)[2]
        else:
            tokenizer, model, baseline_revision = load_checkpoint(baseline_path)
            model.output_bias[0] += 0.001
        candidate = root / f"{name}.json.gz"
        save_checkpoint(candidate, tokenizer, model)
        _, _, revision = load_checkpoint(candidate)
        report = {
            "format": "xsus-en-learning-report-v1",
            "baseline_revision": baseline_revision,
            "candidate_revision": revision,
            "feedback_loss_before": 2.0,
            "feedback_loss_after": 1.5,
            "eligible_for_promotion": True,
            "requires_human_release": True,
        }
        report_path = root / f"{name}-report.json"
        report_path.write_text(json.dumps(report), encoding="utf-8")
        return candidate, report_path, revision

    def test_promotes_immutable_revisions_and_rolls_back_explicitly(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            registry = EnglishModelRegistry(root / "registry")
            first, first_report, first_revision = self._candidate(root, "first", 17)
            scores = {"cases": 2, "accepted": 2, "preserved_all_facts": 2}
            with patch("languages.en.models.registry.load_cases", return_value=(object(),)), \
                 patch("languages.en.models.registry.compare_checkpoint", return_value=scores):
                one = registry.promote_candidate(first, first_report, confirm_revision=first_revision)
                self.assertEqual(registry.load_active()[2], first_revision)
                second, second_report, second_revision = self._candidate(
                    root, "second", 29,
                    baseline_path=registry.root / "versions" / f"{first_revision.removeprefix('sha256-')}.json.gz",
                )
                two = registry.promote_candidate(second, second_report, confirm_revision=second_revision)
                self.assertEqual(registry.load_active()[2], second_revision)
                rolled_back = registry.rollback(first_revision, confirm_current_revision=second_revision)
            self.assertEqual(one["previous_revision"], None)
            self.assertEqual(two["previous_revision"], first_revision)
            self.assertEqual(rolled_back["previous_revision"], second_revision)
            self.assertEqual(registry.load_active()[2], first_revision)
            releases = registry.releases()
            self.assertEqual(len(releases), 2)
            self.assertEqual(sum(item["active"] for item in releases), 1)

    def test_rechecks_benchmarks_and_requires_exact_confirmation(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            registry = EnglishModelRegistry(root / "registry")
            candidate, report, revision = self._candidate(root, "candidate", 31)
            scores = {"cases": 2, "accepted": 2, "preserved_all_facts": 2}
            with patch("languages.en.models.registry.load_cases", return_value=(object(),)), \
                 patch("languages.en.models.registry.compare_checkpoint", return_value=scores):
                with self.assertRaisesRegex(ValueError, "exactly match"):
                    registry.promote_candidate(candidate, report, confirm_revision="sha256-wrong")
            regression = {"cases": 2, "accepted": 1, "preserved_all_facts": 2}
            with patch("languages.en.models.registry.load_cases", return_value=(object(),)), \
                 patch("languages.en.models.registry.compare_checkpoint", side_effect=[scores, scores, regression, regression]):
                with self.assertRaisesRegex(ValueError, "Independent release evaluation failed"):
                    registry.promote_candidate(candidate, report, confirm_revision=revision)
            self.assertEqual(registry.releases(), ())

    def test_active_artifact_checksum_is_verified_on_load(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            registry = EnglishModelRegistry(root / "registry")
            candidate, report, revision = self._candidate(root, "candidate", 43)
            scores = {"cases": 1, "accepted": 1, "preserved_all_facts": 1}
            with patch("languages.en.models.registry.load_cases", return_value=(object(),)), \
                 patch("languages.en.models.registry.compare_checkpoint", return_value=scores):
                registry.promote_candidate(candidate, report, confirm_revision=revision)
            artifact = registry.root / "versions" / f"{revision.removeprefix('sha256-')}.json.gz"
            artifact.write_bytes(b"tampered")
            with self.assertRaisesRegex(ValueError, "checksum does not match"):
                registry.load_active()

