"""Structural sentence relations: bounded and non-entailment tests."""
import unittest

from languages.en.text.understanding.sentence_relations_v1 import (
    compare_sentence_frames, compare_sentence_frames_dict,
)


class SentenceRelationTests(unittest.TestCase):
    def test_same_explicit_frame(self):
        result = compare_sentence_frames("She reads the report.", "She reads the report.")
        self.assertEqual(result.relation, "same_explicit_frame")

    def test_same_lemma_different_surface(self):
        result = compare_sentence_frames("She reads the report.", "I read the report.")
        self.assertEqual(result.relation, "different_explicit_subject")

    def test_opposite_polarity(self):
        result = compare_sentence_frames("The developer builds the application.",
                                         "The developer does not build the application.")
        self.assertEqual(result.relation, "opposite_explicit_polarity")
        self.assertFalse(result.polarity_match)

    def test_different_action(self):
        result = compare_sentence_frames("She reads the report.", "She writes the report.")
        self.assertEqual(result.relation, "different_explicit_action")

    def test_different_object(self):
        result = compare_sentence_frames("She reads the report.", "She reads the document.")
        self.assertEqual(result.relation, "different_explicit_object")

    def test_multiple_differences(self):
        result = compare_sentence_frames("She reads the report.", "He builds the application.")
        self.assertEqual(result.relation, "different_explicit_frames")

    def test_unsupported_input_abstains(self):
        result = compare_sentence_frames("She reads the report.", "She reads the report and writes a file.")
        self.assertEqual(result.status, "abstained")
        self.assertIsNone(result.relation)

    def test_invalid_input_raises(self):
        with self.assertRaises(ValueError):
            compare_sentence_frames("", "She reads the report.")

    def test_privacy_and_no_world_claim(self):
        result = compare_sentence_frames_dict("She reads the report.", "She reads the document.")
        self.assertFalse(result["logical_contradiction_proven"])
        self.assertFalse(result["world_truth_verified"])
        self.assertFalse(result["production_authorized"])
        self.assertNotIn("She reads the report.", repr(result))


if __name__ == "__main__":
    unittest.main()
