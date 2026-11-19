import os
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from languages.en.engine.english_engine import DEFAULT_CHECKPOINT, EnglishEngine, create_engine
from languages.en.models.checkpoint import load_checkpoint, save_checkpoint
from languages.en.models.neural_model import NeuralLanguageModel
from languages.en.models import profiles
from languages.en.models.registry import EnglishModelRegistry, _BASELINE
from languages.en.text.tokenizer import BytePairTokenizer


class EnglishProfileTests(unittest.TestCase):
    def test_default_keeps_the_seed_revision(self):
        with patch.dict(os.environ, {}, clear=True):
            engine = create_engine()
        self.assertEqual(engine.descriptor.identity, EnglishEngine(DEFAULT_CHECKPOINT, "seed").descriptor.identity)

    def test_bundled_profiles_load_with_distinct_verified_revisions(self):
        revisions = set()
        for profile in ("seed-v1", "rewrite-v2", "conversation-v3", "written-v4", "written-v5"):
            with self.subTest(profile=profile):
                with patch.dict(os.environ, {"XSUS_EN_MODEL_PROFILE": profile}, clear=True):
                    engine = create_engine()
                revisions.add(engine.descriptor.identity.revision)
                if profile == "written-v5":
                    self.assertTrue(engine.descriptor.identity.revision.endswith("-proofreader-v7"))
        self.assertEqual(len(revisions), 5)

    def test_invalid_or_conflicting_configuration_fails_at_startup(self):
        cases = (
            ({"XSUS_EN_MODEL_PROFILE": "unknown"}, "Unknown XSUS English profile"),
            ({"XSUS_EN_MODEL_PROFILE": "seed-v1", "XSUS_EN_CHECKPOINT": str(DEFAULT_CHECKPOINT)}, "Choose"),
        )
        for env, message in cases:
            with self.subTest(env=env), patch.dict(os.environ, env, clear=True):
                with self.assertRaisesRegex(ValueError, message):
                    create_engine()

    def test_mismatched_profile_digest_is_rejected(self):
        with patch.object(profiles, "load_checkpoint", return_value=(None, None, "sha256-mismatch")):
            with self.assertRaisesRegex(ValueError, "checksum does not match"):
                profiles.load_profile("seed-v1")

    def test_active_profile_requires_a_registry_path(self):
        with patch.dict(os.environ, {"XSUS_EN_MODEL_PROFILE": "active"}, clear=True):
            with self.assertRaisesRegex(ValueError, "XSUS_EN_MODEL_REGISTRY is required"):
                create_engine()

    def test_engine_loads_only_a_promoted_registry_revision(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            candidate = root / "candidate.json.gz"
            tokenizer = BytePairTokenizer()
            model = NeuralLanguageModel.initialize(vocab_size=tokenizer.vocab_size, hidden_size=4, context_size=8, seed=53)
            save_checkpoint(candidate, tokenizer, model)
            revision = load_checkpoint(candidate)[2]
            report = root / "report.json"
            report.write_text(json.dumps({
                "format": "xsus-en-learning-report-v1",
                "baseline_revision": load_checkpoint(_BASELINE)[2],
                "candidate_revision": revision,
                "feedback_loss_before": 2.0,
                "feedback_loss_after": 1.0,
                "eligible_for_promotion": True,
                "requires_human_release": True,
            }), encoding="utf-8")
            registry = EnglishModelRegistry(root / "registry")
            scores = {"cases": 1, "accepted": 1, "preserved_all_facts": 1}
            with patch("languages.en.models.registry.load_cases", return_value=(object(),)), \
                 patch("languages.en.models.registry.compare_checkpoint", return_value=scores):
                registry.promote_candidate(candidate, report, confirm_revision=revision)
            with patch.dict(os.environ, {
                "XSUS_EN_MODEL_PROFILE": "active",
                "XSUS_EN_MODEL_REGISTRY": str(registry.root),
            }, clear=True):
                engine = create_engine()
            self.assertEqual(engine.descriptor.identity.revision, revision)
