import unittest
from pathlib import Path

from languages.en.evaluation.proofreading import evaluate
from languages.en.text.editing.document import proofread_markdown
from languages.en.text.editing.paragraph import ParagraphStatus

_CASES = Path(__file__).resolve().parents[1] / "evaluation" / "proofreading-documents-v1.jsonl"


class MarkdownProofreadingTests(unittest.TestCase):
    def test_independently_authored_documents(self):
        report = evaluate(_CASES, documents=True)
        self.assertGreaterEqual(report["cases"], 30)
        self.assertEqual(set(report["by_status"]), set(ParagraphStatus))
        self.assertEqual(report["failures"], [])

    def test_global_edits_only_touch_prose_and_preserve_crlf(self):
        source = "---\r\ntitle: They writes\r\n---\r\n\r\nThey\r\nwrites.\r\n\r\n~~~\r\nThey writes.\r\n~~~\r\n"
        result = proofread_markdown(source)
        self.assertEqual(result.status, ParagraphStatus.CORRECTED)
        self.assertEqual([section.kind for section in result.sections], ["front_matter", "prose", "code"])
        self.assertEqual(len(result.edits), 1)
        edit = result.edits[0]
        self.assertEqual(source[edit.start:edit.end], edit.original)
        self.assertEqual(result.text, source[:edit.start] + edit.replacement + source[edit.end:])
        self.assertIn("They\r\nwrite.", result.text)
        self.assertTrue(result.text.endswith("~~~\r\nThey writes.\r\n~~~\r\n"))

    def test_nested_html_does_not_expose_raw_region_to_editor(self):
        protected = '<section data-name=">">\n\n<section>Inner.</section>\n\nThey writes.\n\n</section>'
        result = proofread_markdown(protected + "\n\nThey writes.")
        self.assertEqual(result.status, ParagraphStatus.CORRECTED)
        self.assertEqual(result.text, protected + "\n\nThey write.")
        self.assertEqual(len(result.edits), 1)

    def test_unclosed_fence_preserves_everything_to_end(self):
        source = "They writes.\n\n````python\n\n```\n\nThey writes."
        result = proofread_markdown(source)
        self.assertEqual(result.text, source.replace("They writes.", "They write.", 1))
        self.assertEqual(result.sections[-1].kind, "code")
        self.assertEqual(result.sections[-1].end, len(source))

    def test_document_limits_preserve_entire_input(self):
        for source in ("A" * 65_537, "They writes.\n\n" * 513):
            with self.subTest(size=len(source)):
                result = proofread_markdown(source)
                self.assertEqual((result.status, result.text, result.edits), (ParagraphStatus.REVIEW_REQUIRED, source, ()))
                self.assertEqual(result.review_reason, "input_limit")
