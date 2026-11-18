import unittest
from pathlib import Path

from languages.en.evaluation.proofreading import evaluate
from languages.en.text.editing.proofreader import ProofreadingStatus, proofread_sentence

_CASES = Path(__file__).resolve().parents[1] / "evaluation" / "proofreading-v1.jsonl"


class ProofreadingTests(unittest.TestCase):
    def test_independent_proofreading_cases(self):
        report = evaluate(_CASES)
        self.assertGreaterEqual(report["cases"], 40)
        self.assertEqual(set(report["by_status"]), set(ProofreadingStatus))
        self.assertEqual(report["failures"], [])

    def test_edits_report_original_offsets_without_normalizing_formatting(self):
        source = "  She\tHAVE  wrote the report. "
        result = proofread_sentence(source)
        self.assertEqual(result.text, "  She\tHAS  written the report. ")
        self.assertEqual(result.status, ProofreadingStatus.CORRECTED)
        self.assertEqual([(e.original, e.replacement) for e in result.edits], [("HAVE", "HAS"), ("wrote", "written")])
        for edit in result.edits:
            self.assertEqual(source[edit.start:edit.end], edit.original)

    def test_oversized_input_is_returned_without_editing(self):
        source = "They writes. " * 200
        result = proofread_sentence(source)
        self.assertEqual((result.status, result.text, result.edits), (ProofreadingStatus.REVIEW_REQUIRED, source, ()))
        self.assertEqual(result.review_reason, "input_limit")
