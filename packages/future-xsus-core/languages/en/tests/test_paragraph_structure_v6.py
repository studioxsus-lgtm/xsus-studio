import json
import unittest
from dataclasses import asdict
from languages.en.text.paragraph_structure_v6 import analyze_paragraphs_v6


class ParagraphStructureV6Tests(unittest.TestCase):
    def test_single_paragraph(self):
        r = analyze_paragraphs_v6("The report arrived.")
        self.assertEqual(r.paragraph_count, 1)
        self.assertEqual(r.adjacent_links, ())

    def test_blank_line_separates(self):
        r = analyze_paragraphs_v6("The report arrived.\n\nThe report was signed.")
        self.assertEqual(r.paragraph_count, 2)

    def test_single_newline_does_not_separate(self):
        self.assertEqual(analyze_paragraphs_v6("First line.\nSecond line.").paragraph_count, 1)

    def test_multiple_blank_lines(self):
        self.assertEqual(analyze_paragraphs_v6("Alpha.\n\n\nBeta.").paragraph_count, 2)

    def test_word_count(self):
        self.assertEqual(analyze_paragraphs_v6("The report arrived.").paragraphs[0].word_count, 3)

    def test_sentence_count(self):
        self.assertEqual(analyze_paragraphs_v6("The report arrived. It was signed.").paragraphs[0].sentence_count, 2)

    def test_opening_contrast(self):
        r = analyze_paragraphs_v6("However, the report arrived.")
        self.assertEqual(r.paragraphs[0].opening_transition, "contrast")

    def test_opening_consequence(self):
        r = analyze_paragraphs_v6("As a result, the plan changed.")
        self.assertEqual(r.paragraphs[0].opening_transition, "consequence")

    def test_opening_sequence(self):
        r = analyze_paragraphs_v6("First, read the report.")
        self.assertEqual(r.paragraphs[0].opening_transition, "sequence")

    def test_opening_example(self):
        r = analyze_paragraphs_v6("For example, read the report.")
        self.assertEqual(r.paragraphs[0].opening_transition, "example")

    def test_transition_not_at_opening(self):
        r = analyze_paragraphs_v6("The report arrived. However, it was incomplete.")
        self.assertIsNone(r.paragraphs[0].opening_transition)

    def test_shared_terms_between_paragraphs(self):
        r = analyze_paragraphs_v6("The report arrived.\n\nThe report was signed.")
        self.assertEqual(r.adjacent_links[0].shared_terms, ("report",))

    def test_no_shared_terms(self):
        r = analyze_paragraphs_v6("Birds migrate.\n\nEngines run.")
        self.assertEqual(r.adjacent_links[0].shared_terms, ())

    def test_three_paragraph_links(self):
        r = analyze_paragraphs_v6("Alpha.\n\nBeta.\n\nGamma.")
        self.assertEqual(len(r.adjacent_links), 2)

    def test_uncertainty_propagated(self):
        r = analyze_paragraphs_v6("Dr. Lee arrived.")
        self.assertTrue(r.paragraphs[0].segmentation_uncertain)

    def test_no_quality_claim(self):
        self.assertFalse(analyze_paragraphs_v6("The report arrived.").evaluates_document_quality)

    def test_json_serializable(self):
        json.dumps(asdict(analyze_paragraphs_v6("The report arrived.")))

    def test_deterministic(self):
        text = "The report arrived.\n\nThe report was signed."
        self.assertEqual(analyze_paragraphs_v6(text), analyze_paragraphs_v6(text))

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            analyze_paragraphs_v6(" ")

    def test_invalid_type_rejected(self):
        with self.assertRaises(ValueError):
            analyze_paragraphs_v6(None)

    def test_oversized_rejected(self):
        with self.assertRaises(ValueError):
            analyze_paragraphs_v6("x" * 10001)
