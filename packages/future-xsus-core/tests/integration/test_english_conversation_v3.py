import hashlib
import io
import tomllib
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

from languages.en.evaluation.demo import run

LANGUAGE_ROOT = Path(__file__).resolve().parents[2] / "languages" / "en"


class EnglishConversationV3IntegrationTests(unittest.IsolatedAsyncioTestCase):
    async def test_clarification_and_rewrite_follow_up_through_the_core(self):
        with (LANGUAGE_ROOT / "models" / "manifests" / "conversation-v3.toml").open("rb") as source:
            manifest = tomllib.load(source)
        checkpoint = LANGUAGE_ROOT / manifest["checkpoint"]
        self.assertEqual(hashlib.sha256(checkpoint.read_bytes()).hexdigest(), manifest["sha256"])

        with patch.dict("os.environ", {"XSUS_EN_CHECKPOINT": str(checkpoint)}):
            output = io.StringIO()
            with redirect_stdout(output):
                status = await run("Clarify: Please return the receipt soon.", None)
            self.assertEqual(status, 0)
            self.assertEqual(output.getvalue().splitlines(), ["What deadline should the message specify?"])

            output = io.StringIO()
            with redirect_stdout(output):
                status = await run(
                    "Give this a warmer tone: We need the receipt by Friday at 9 a.m.",
                    "Can you say it in fewer words?",
                )
            self.assertEqual(status, 0)
            self.assertEqual(output.getvalue().splitlines(), [
                "We would appreciate receiving the receipt by Friday at 9 a.m.",
                "Please send the receipt by Friday at 9 a.m.",
            ])
