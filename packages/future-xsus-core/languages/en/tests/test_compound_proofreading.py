import unittest
from pathlib import Path

from languages.en.evaluation.proofreading import evaluate
from languages.en.text.editing.proofreader import ProofreadingStatus, proofread_sentence

_CASES = Path(__file__).resolve().parents[1] / "evaluation" / "proofreading-compounds-v1.jsonl"


class CompoundProofreadingTests(unittest.TestCase):
    def test_independent_compound_cases(self):
        report = evaluate(_CASES)
        self.assertGreaterEqual(report["cases"], 24)
        self.assertEqual(set(report["by_status"]), set(ProofreadingStatus))
        self.assertEqual(report["failures"], [])

    def test_offsets_combined_with_sentence_edits(self):
        source = "  They writes,\tshe have wrote the report. "
        result = proofread_sentence(source)
        self.assertEqual(result.status, ProofreadingStatus.CORRECTED)
        self.assertEqual(result.text, "  They write;\tshe has written the report. ")
        rebuilt = source
        for edit in reversed(result.edits):
            self.assertEqual(source[edit.start:edit.end], edit.original)
            rebuilt = rebuilt[:edit.start] + edit.replacement + rebuilt[edit.end:]
        self.assertEqual(rebuilt, result.text)
        checked = proofread_sentence(result.text)
        self.assertEqual(checked.status, ProofreadingStatus.UNCHANGED)
        self.assertEqual(checked.edits, ())

    def test_uncertain_second_clause_does_not_commit_first_clause_edits(self):
        source = "They writes; Alex told Mia that he wrote."
        result = proofread_sentence(source)
        self.assertEqual((result.status, result.text, result.edits), (ProofreadingStatus.REVIEW_REQUIRED, source, ()))
