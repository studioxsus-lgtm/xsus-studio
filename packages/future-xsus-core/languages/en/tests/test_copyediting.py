import unittest
from pathlib import Path

from languages.en.evaluation.proofreading import evaluate
from languages.en.text.editing.copyedit import copyedit_sentence
from languages.en.text.editing.document import proofread_markdown
from languages.en.text.editing.paragraph import ParagraphStatus, proofread_paragraph
from languages.en.text.editing.proofreader import ProofreadingStatus, proofread_sentence

_CASES = Path(__file__).resolve().parents[1] / "evaluation" / "copyediting-v1.jsonl"


class CopyeditingTests(unittest.TestCase):
    def test_independent_cases(self):
        report = evaluate(_CASES, copyedit=True)
        self.assertGreaterEqual(report["cases"], 70)
        self.assertEqual(set(report["by_status"]), set(ProofreadingStatus))
        self.assertEqual(report["failures"], [])

    def test_grammar_and_spelling_share_original_coordinates(self):
        source = "  They have recieved a invoice,\tNina reads an report. "
        result = copyedit_sentence(source)
        self.assertEqual(result.status, ProofreadingStatus.CORRECTED)
        self.assertEqual(result.text, "  They have received an invoice;\tNina reads a report. ")
        restored = source
        for edit in reversed(result.edits):
            self.assertEqual(source[edit.start:edit.end], edit.original)
            restored = restored[:edit.start] + edit.replacement + restored[edit.end:]
        self.assertEqual(restored, result.text)
        self.assertEqual(copyedit_sentence(result.text).status, ProofreadingStatus.UNCHANGED)

    def test_sentence_initial_single_letter_article_keeps_sentence_case(self):
        result = copyedit_sentence("A hour is early.")
        self.assertEqual((result.status, result.text), (ProofreadingStatus.CORRECTED, "An hour is early."))

    def test_punctuation_spacing_composes_with_grammar_and_spelling(self):
        source = "They recieve a invoice,they reads the report ."
        result = copyedit_sentence(source)
        self.assertEqual(result.status, ProofreadingStatus.CORRECTED)
        self.assertEqual(result.text, "They receive an invoice; they read the report.")
        restored = source
        for edit in reversed(result.edits):
            self.assertEqual(source[edit.start:edit.end], edit.original)
            restored = restored[:edit.start] + edit.replacement + restored[edit.end:]
        self.assertEqual(restored, result.text)

    def test_punctuation_spacing_does_not_rewrite_numeric_separators(self):
        from languages.en.text.editing.punctuation import punctuation_edits

        source = "The budget is 1,000; the ratio is 3:2."
        self.assertEqual(punctuation_edits(source), ())

    def test_standalone_punctuation_copyedit_does_not_depend_on_clause_parser(self):
        source = "They check,the notes ."
        result = copyedit_sentence(source)
        self.assertEqual((result.status, result.text), (
            ProofreadingStatus.CORRECTED, "They check, the notes."
        ))
        restored = source
        for edit in reversed(result.edits):
            self.assertEqual(source[edit.start:edit.end], edit.original)
            restored = restored[:edit.start] + edit.replacement + restored[edit.end:]
        self.assertEqual(restored, result.text)

    def test_conversation_copyedit_and_explanation_are_english(self):
        from languages.en.text.editing.requests import answer_proofreading_request

        self.assertEqual(
            answer_proofreading_request("Copyedit: They check,the report ."),
            "They check, the report.",
        )
        explained = answer_proofreading_request("Explain copyedits: They check,the report.")
        self.assertIn("Insert a missing space after the punctuation mark.", explained)

    def test_overlap_leaves_every_proposed_edit_unapplied(self):
        source = "He recieve a invoice."
        result = copyedit_sentence(source)
        self.assertEqual((result.status, result.text, result.edits), (ProofreadingStatus.REVIEW_REQUIRED, source, ()))
        self.assertEqual(result.review_reason, "overlapping_edits")

    def test_orthography_is_opt_in_for_sentences_and_paragraphs(self):
        source = "They recieved an report."
        self.assertEqual(proofread_sentence(source).text, source)
        self.assertEqual(proofread_paragraph(source).text, source)
        self.assertEqual(proofread_paragraph(source, orthography=True).text, "They received a report.")

    def test_markdown_copyediting_only_changes_editable_prose(self):
        source = "# Teh file\r\n\r\nTeh files is ready.\r\n\r\n~~~\r\nTeh files is ready.\r\n~~~"
        result = proofread_markdown(source, orthography=True)
        self.assertEqual(result.status, ParagraphStatus.CORRECTED)
        self.assertEqual(result.text, "# Teh file\r\n\r\nThe files are ready.\r\n\r\n~~~\r\nTeh files is ready.\r\n~~~")

    def test_markdown_copyediting_fixes_prose_spacing_and_preserves_fences(self):
        source = (
            "# Draft\r\n\r\nThe report is ready ,today.\r\n\r\n"
            "~~~text\r\nThe report is ready ,today.\r\n~~~"
        )
        result = proofread_markdown(source, orthography=True)
        self.assertEqual(result.status, ParagraphStatus.CORRECTED)
        self.assertEqual(result.text, (
            "# Draft\r\n\r\nThe report is ready, today.\r\n\r\n"
            "~~~text\r\nThe report is ready ,today.\r\n~~~"
        ))
