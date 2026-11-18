import io
import os
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch

from languages.en.evaluation.demo import run


class EnglishProofreadingIntegrationTests(unittest.IsolatedAsyncioTestCase):
    async def test_editor_commands_and_model_generation_share_the_normal_engine(self):
        cases = (
            ("Proofread: Was those reports written by she?", "Were those reports written by her?"),
            ("Correct the grammar: What did Nina wrote?", "What did Nina write?"),
            ("Proofread: They write reports.", "No grammar correction found in this sentence.\nThey write reports."),
            ("Proofread: I told Sam that he write.", "This sentence needs manual review.\nI told Sam that he write."),
            ("Proofread: ", "Please provide one English sentence to proofread."),
            (
                "Could you explain essential relative clauses?",
                "A restrictive clause identifies which person or thing you mean. Do not separate it with commas: "
                "The files that contain errors need review.",
            ),
        )
        with patch.dict(os.environ, {"XSUS_EN_MODEL_PROFILE": "written-v5"}, clear=True):
            for prompt, expected in cases:
                with self.subTest(prompt=prompt), redirect_stdout(io.StringIO()) as output:
                    self.assertEqual(await run(prompt, None), 0)
                    self.assertEqual(output.getvalue().rstrip("\n"), expected)
