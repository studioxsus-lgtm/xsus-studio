"""Bounded sentence batch contracts and negative tests."""
import unittest

from languages.en.text.understanding.sentence_batch_v1 import (
    MAX_SENTENCES, analyze_sentence_batch, compare_sentence_batch_pairs,
)


class SentenceBatchTests(unittest.TestCase):
    def test_mixed_batch_summary(self):
        report = analyze_sentence_batch([
            "She reads the report.",
            "She does not read the report.",
            "She reads secret data.",
        ])
        self.assertEqual(report["summary"], {
            "total": 3, "resolved": 2, "abstained": 1, "positive": 1, "negative": 1,
        })
        self.assertEqual([item["index"] for item in report["items"]], [0, 1, 2])

    def test_batch_does_not_echo_input(self):
        report = analyze_sentence_batch(["She reads secret data."])
        self.assertNotIn("secret data", repr(report))
        self.assertFalse(report["production_authorized"])
        self.assertFalse(report["document_understanding_proven"])

    def test_max_batch_size(self):
        report = analyze_sentence_batch(["She reads the report."] * MAX_SENTENCES)
        self.assertEqual(report["summary"]["resolved"], MAX_SENTENCES)

    def test_invalid_batch_inputs(self):
        for value in (None, "She reads the report.", [], [""], [None],
                      ["She reads the report."] * (MAX_SENTENCES + 1),
                      ["x" * 8193]):
            with self.subTest(value=str(value)[:30]):
                with self.assertRaises(ValueError):
                    analyze_sentence_batch(value)

    def test_pair_comparison(self):
        sentences = ["She reads the report.", "She does not read the report.",
                     "She reads secret data."]
        report = compare_sentence_batch_pairs(sentences, [(0, 1), (0, 2)])
        self.assertEqual(report["total_pairs"], 2)
        self.assertEqual(report["resolved"], 1)
        self.assertEqual(report["abstained"], 1)
        self.assertEqual(report["relations"][0]["relation"], "opposite_explicit_polarity")
        self.assertIsNone(report["relations"][1]["relation"])
        self.assertFalse(report["logical_contradiction_proven"])

    def test_rejects_invalid_pair_indices(self):
        sentences = ["She reads the report."]
        for pairs in ([], [(0, 1)], [(True, 0)], [(0, -1)], [(0,)],
                      [(0, 0)] * 65, ["0,0"], [(0, 0, 0)]):
            with self.subTest(pairs=str(pairs)[:30]):
                with self.assertRaises(ValueError):
                    compare_sentence_batch_pairs(sentences, pairs)

    def test_pair_comparison_does_not_echo_source(self):
        report = compare_sentence_batch_pairs(
            ["She reads the report.", "She reads secret data."], [(0, 1)]
        )
        self.assertNotIn("secret data", repr(report))
        self.assertFalse(report["production_authorized"])


if __name__ == "__main__":
    unittest.main()
