import os
import unittest
from unittest.mock import patch

from languages.en.engine.english_engine import DEFAULT_CHECKPOINT, EnglishEngine, create_engine
from languages.en.models import profiles


class EnglishProfileTests(unittest.TestCase):
    def test_default_keeps_the_seed_revision(self):
        with patch.dict(os.environ, {}, clear=True):
            engine = create_engine()
        self.assertEqual(engine.descriptor.identity, EnglishEngine(DEFAULT_CHECKPOINT, "seed").descriptor.identity)

    def test_bundled_profiles_load_with_distinct_verified_revisions(self):
        revisions = set()
        for profile in ("seed-v1", "rewrite-v2", "conversation-v3"):
            with self.subTest(profile=profile):
                with patch.dict(os.environ, {"XSUS_EN_MODEL_PROFILE": profile}, clear=True):
                    engine = create_engine()
                revisions.add(engine.descriptor.identity.revision)
        self.assertEqual(len(revisions), 3)

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
