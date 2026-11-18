import unittest
from pathlib import Path

from languages.en.evaluation.proofreading import evaluate
from languages.en.text.editing.proofreader import ProofreadingStatus, proofread_sentence

_CASES = Path(__file__).resolve().parents[1] / "evaluation" / "proofreading-dependent-v1.jsonl"


class DependentProofreadingTests(unittest.TestCase):
    def test_independent_cases(self):
        report = evaluate(_CASES)
        self.assertGreaterEqual(report["cases"], 40)
        self.assertEqual(set(report["by_status"]), set(ProofreadingStatus))
        self.assertEqual(report["failures"], [])

    def test_edits_reference_original_offsets_across_preserved_link(self):
        source = "  Although they writes,\tNina HAVE checked the report. "
        result = proofread_sentence(source)
        self.assertEqual(result.text, "  Although they write,\tNina HAS checked the report. ")
        self.assertEqual(result.status, ProofreadingStatus.CORRECTED)
        self.assertEqual([edit.original for edit in result.edits], ["writes", "HAVE"])
        for edit in result.edits:
            self.assertEqual(source[edit.start:edit.end], edit.original)

    def test_conditional_and_embedded_ambiguity_are_not_changed(self):
        for text, reason in (
            ("If she were ready, Nina would read the report.", "possible_irrealis"),
            ("Alex tells Mia if she writes the report.", "possible_embedded_question"),
        ):
            with self.subTest(text=text):
                result = proofread_sentence(text)
                self.assertEqual(result.status, ProofreadingStatus.REVIEW_REQUIRED)
                self.assertEqual((result.text, result.edits, result.review_reason), (text, (), reason))

    def test_initial_marker_without_main_clause_can_never_be_a_proper_name(self):
        source = "\nAlthough Nina have wrote the report."
        result = proofread_sentence(source)
        self.assertEqual((result.status, result.text, result.edits), (ProofreadingStatus.REVIEW_REQUIRED, source, ()))
