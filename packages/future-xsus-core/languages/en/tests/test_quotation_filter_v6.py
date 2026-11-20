import json
import unittest
from dataclasses import asdict
from languages.en.text.quotation_filter_v6 import analyze_quotation_filter_v6


class QuotationFilterV6Tests(unittest.TestCase):
    def test_quoted_contrast_word(self):
        self.assertFalse(analyze_quotation_filter_v6('He wrote "however" on the board.').contrast)

    def test_quoted_reference_word(self):
        self.assertFalse(analyze_quotation_filter_v6('The sign reads "she".').reference)

    def test_curly_double_quotes(self):
        self.assertFalse(analyze_quotation_filter_v6('The word “however” appears.').contrast)

    def test_curly_single_quotes(self):
        self.assertFalse(analyze_quotation_filter_v6('The sign reads ‘she’.').reference)

    def test_real_contrast(self):
        self.assertTrue(analyze_quotation_filter_v6('However, costs rose.').contrast)

    def test_real_reference(self):
        self.assertTrue(analyze_quotation_filter_v6('Alex arrived. She waved.').reference)

    def test_quoted_speech_not_suppressed(self):
        self.assertTrue(analyze_quotation_filter_v6('"However, costs rose."').contrast)

    def test_quoted_reference_in_speech_not_suppressed(self):
        self.assertTrue(analyze_quotation_filter_v6('"She waved."').reference)

    def test_mixed_quoted_and_real_contrast(self):
        r = analyze_quotation_filter_v6('He wrote "however". However, costs rose.')
        self.assertTrue(r.contrast)

    def test_mixed_quoted_and_real_reference(self):
        r = analyze_quotation_filter_v6('He wrote "she". She waved.')
        self.assertTrue(r.reference)

    def test_word_mention_still_suppressed(self):
        self.assertFalse(analyze_quotation_filter_v6('The word however appears.').contrast)

    def test_reference_word_mention_still_suppressed(self):
        self.assertFalse(analyze_quotation_filter_v6('The word she appears.').reference)

    def test_suppression_reason(self):
        r = analyze_quotation_filter_v6('He wrote "however".')
        self.assertIn((0, 'however', 'isolated_quotation'), r.suppressed)

    def test_unmatched_quote_uncertain(self):
        self.assertTrue(analyze_quotation_filter_v6('He wrote "however.').unmatched_quote_uncertain)

    def test_balanced_quote_not_uncertain(self):
        self.assertFalse(analyze_quotation_filter_v6('He wrote "however".').unmatched_quote_uncertain)

    def test_no_semantic_claim(self):
        r = analyze_quotation_filter_v6('"However, costs rose."')
        self.assertFalse(r.understands_quoted_speech)
        self.assertFalse(r.resolves_referents)

    def test_json_serializable(self):
        json.dumps(asdict(analyze_quotation_filter_v6('The sign reads "she".')))

    def test_deterministic(self):
        text = 'The word "however" appears.'
        self.assertEqual(analyze_quotation_filter_v6(text), analyze_quotation_filter_v6(text))

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            analyze_quotation_filter_v6('')

    def test_oversized_rejected(self):
        with self.assertRaises(ValueError):
            analyze_quotation_filter_v6('x' * 10001)

    def test_invalid_type_rejected(self):
        with self.assertRaises(ValueError):
            analyze_quotation_filter_v6(None)
