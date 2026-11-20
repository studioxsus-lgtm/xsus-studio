import unittest
from dataclasses import asdict
from languages.en.text.discourse_v6 import analyze_discourse_v6


class DiscourseV6Tests(unittest.TestCase):
    def test_single_sentence(self):
        result = analyze_discourse_v6("The report is ready.")
        self.assertEqual(result.sentence_count, 1)
        self.assertEqual(result.adjacent_without_shared_terms, ())

    def test_adjacent_overlap(self):
        result = analyze_discourse_v6("The report is ready. The report is signed.")
        self.assertEqual(result.adjacent_shared_terms, ((0, 1, ("report",)),))

    def test_no_overlap_is_not_claimed_incoherent(self):
        result = analyze_discourse_v6("The report is ready. Birds migrate.")
        self.assertEqual(result.adjacent_without_shared_terms, ((0, 1),))
        self.assertTrue(result.lexical_overlap_is_not_coherence)

    def test_contrast_cue(self):
        result = analyze_discourse_v6("The draft is ready. However, the review is pending.")
        self.assertIn((1, "contrast", "however"), result.explicit_cues)

    def test_consequence_cue(self):
        result = analyze_discourse_v6("The file arrived. Therefore, the review can begin.")
        self.assertIn((1, "consequence", "therefore"), result.explicit_cues)

    def test_multiword_cue(self):
        result = analyze_discourse_v6("We checked the data. As a result, we revised the report.")
        self.assertIn((1, "consequence", "as a result"), result.explicit_cues)

    def test_example_cue(self):
        result = analyze_discourse_v6("We have options. For example, we can revise the draft.")
        self.assertIn((1, "example", "for example"), result.explicit_cues)

    def test_sequence_cues(self):
        result = analyze_discourse_v6("First, read the report. Next, review the report.")
        self.assertIn((0, "sequence", "first"), result.explicit_cues)
        self.assertIn((1, "sequence", "next"), result.explicit_cues)

    def test_case_insensitive_overlap(self):
        result = analyze_discourse_v6("Reports are useful. REPORTS need review.")
        self.assertEqual(result.adjacent_shared_terms, ((0, 1, ("reports",)),))

    def test_stopwords_not_counted_as_overlap(self):
        result = analyze_discourse_v6("The cat sleeps. The dog runs.")
        self.assertEqual(result.adjacent_without_shared_terms, ((0, 1),))

    def test_segmentation_uncertainty_propagated(self):
        result = analyze_discourse_v6("Dr. Smith wrote the report. The report arrived.")
        self.assertTrue(result.segmentation_uncertain)

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            analyze_discourse_v6("")

    def test_non_string_rejected(self):
        with self.assertRaises(ValueError):
            analyze_discourse_v6(None)

    def test_oversized_rejected(self):
        with self.assertRaises(ValueError):
            analyze_discourse_v6("x" * 10001)

    def test_serializable(self):
        self.assertEqual(asdict(analyze_discourse_v6("The report arrived."))["sentence_count"], 1)

    def test_deterministic(self):
        text = "The report arrived. However, the report was incomplete."
        self.assertEqual(analyze_discourse_v6(text), analyze_discourse_v6(text))
