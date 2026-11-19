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
            (
                "Explain corrections: They writes, Alex reads.",
                "They write; Alex reads.\n\nChanges:\n"
                "- 'writes' → 'write'. Make the finite verb agree with its subject.\n"
                "- ',' → ';'. A semicolon can join two independent clauses without a conjunction.",
            ),
            (
                "Explain paragraph corrections: They writes. This is a test sentence with a relative clause that it does not recognize.",
                "Some sentences still need manual review.\nThey write. This is a test sentence with a relative clause that it does not recognize."
                "\n\nChanges:\n- 'writes' → 'write'. Make the finite verb agree with its subject.",
            ),
            (
                "Proofread: Although they writes, Nina have checked the report.",
                "Although they write, Nina has checked the report.",
            ),
            (
                "Explain corrections: If she were ready, Nina would read the report.",
                "This sentence needs manual review.\nIf she were ready, Nina would read the report."
                "\n\nReview notes:\n- In a hypothetical condition, 'were' can be valid with a singular subject.",
            ),
            (
                "Proofread Markdown:\n---\ntitle: They writes\n---\n\nThey writes.\n\n~~~\nThey writes.\n~~~",
                "---\ntitle: They writes\n---\n\nThey write.\n\n~~~\nThey writes.\n~~~",
            ),
            ("Copyedit: They recieved an report.", "They received a report."),
            ("Copyedit: they write the report.", "They write the report."),
            ("Copyedit: i has a invoice.", "I have an invoice."),
            ("Copyedit: What did i write?", "What did I write?"),
            (
                "Explain copyedits: They received an report.",
                "They received a report.\n\nChanges:\n- 'an' → 'a'. Choose a or an by the sound of the following word.",
            ),
            (
                "Copyedit Markdown:\n# Teh file\n\nTeh files is ready.",
                "# Teh file\n\nThe files are ready.",
            ),
            ("Proofread: ", "Please provide one English sentence to proofread."),
            (
                "Proofread paragraph: They writes. What did Alex wrote?",
                "They write. What did Alex write?",
            ),
            (
                "Proofread paragraph: They writes. I told Sam that he write.",
                "Some sentences still need manual review.\nThey write. I told Sam that he write.",
            ),
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
