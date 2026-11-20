import unittest
from languages.en.text.structure_v6 import analyze_structure

class StructureV6Tests(unittest.TestCase):
    def test_sentences(self):
        result = analyze_structure("Alex arrived. Sam waited? They left!")
        self.assertEqual(result.sentences, ("Alex arrived.", "Sam waited?", "They left!"))

    def test_discourse_markers(self):
        result = analyze_structure("First, we plan. However, we wait. Therefore, we revise.")
        self.assertIn((0, "sequence", "first"), result.markers)
        self.assertIn((1, "contrast", "however"), result.markers)
        self.assertIn((2, "consequence", "therefore"), result.markers)

    def test_does_not_claim_full_segmentation(self):
        self.assertTrue(analyze_structure("Dr. Smith arrived. He left.").segmentation_uncertain)

    def test_no_fabricated_markers(self):
        self.assertEqual(analyze_structure("The report is ready.").markers, ())

    def test_invalid_input(self):
        for text in (None, "", " ", "a" * 10001):
            with self.subTest(text=str(text)[:8]), self.assertRaises(ValueError):
                analyze_structure(text)
