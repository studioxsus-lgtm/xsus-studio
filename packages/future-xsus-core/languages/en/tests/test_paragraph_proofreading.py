import unittest
from pathlib import Path

from languages.en.evaluation.proofreading import evaluate
from languages.en.text.editing.paragraph import ParagraphStatus, proofread_paragraph

_CASES = Path(__file__).resolve().parents[1] / "evaluation" / "proofreading-paragraphs-v1.jsonl"


class ParagraphProofreadingTests(unittest.TestCase):
    def test_independently_authored_cases_cover_every_outcome(self):
        report = evaluate(_CASES, paragraphs=True)
        self.assertGreaterEqual(report["cases"], 24)
        self.assertEqual(set(report["by_status"]), set(ParagraphStatus))
        self.assertEqual(report["failures"], [])

    def test_global_offsets_allow_reapplying_edits_to_unmodified_document(self):
        source = "They writes.\r\n\r\nWhat did Alex wrote?  These reports are ready.\t"
        result = proofread_paragraph(source)
        self.assertEqual(result.status, ParagraphStatus.CORRECTED)
        rebuilt = source
        for edit in reversed(result.edits):
            self.assertEqual(source[edit.start:edit.end], edit.original)
            rebuilt = rebuilt[:edit.start] + edit.replacement + rebuilt[edit.end:]
        self.assertEqual(result.text, rebuilt)
        self.assertEqual(result.text, "They write.\r\n\r\nWhat did Alex write?  These reports are ready.\t")

    def test_internal_punctuation_in_quotes_is_not_a_new_editable_sentence(self):
        protected = 'Alex said “Start here. They writes. Continue.”'
        result = proofread_paragraph(protected + "\n\nThey writes.")
        self.assertEqual(result.status, ParagraphStatus.PARTIAL)
        self.assertEqual(result.text, protected + "\n\nThey write.")
        self.assertEqual(len(result.edits), 1)

    def test_segment_limit_returns_original_instead_of_partial_rewrite(self):
        source = "They writes. " * 129
        result = proofread_paragraph(source)
        self.assertEqual((result.status, result.text, result.edits), (ParagraphStatus.REVIEW_REQUIRED, source, ()))
        self.assertEqual(result.review_reason, "input_limit")
