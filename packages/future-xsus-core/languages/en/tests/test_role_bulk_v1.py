"""Phase 3.5 thousand-sentence bulk role processing tests."""
import unittest

from languages.en.text.understanding.role_bulk_v1 import (
    analyze_role_bulk, role_bulk_summary,
)


class RoleBulkTests(unittest.TestCase):
    def test_one_thousand_sentences(self):
        sentences = ["She reads the report." if i % 2 == 0 else
                     "She does not read the report." for i in range(1000)]
        report = analyze_role_bulk(sentences)
        self.assertEqual(report.total, 1000)
        self.assertEqual(report.resolved, 1000)
        self.assertEqual(report.abstained, 0)
        self.assertEqual(len(report.results), 1000)
        self.assertEqual([entry["index"] for entry in report.results], list(range(1000)))
        self.assertGreaterEqual(report.chunks, 32)
        self.assertEqual(report.results[1]["polarity"], "negative")

    def test_mixed_unsupported(self):
        sentences = ["She reads the report." if i % 5 else
                     "She reads private records." for i in range(1000)]
        report = analyze_role_bulk(sentences)
        self.assertEqual(report.resolved, 800)
        self.assertEqual(report.abstained, 200)
        self.assertEqual(report.results[0]["status"], "abstained")
        self.assertNotIn("private records", repr(report))

    def test_long_sentence_chunks(self):
        sentences = ["x" * 900 for _ in range(100)]
        report = analyze_role_bulk(sentences)
        self.assertEqual(report.total, 100)
        self.assertEqual(report.abstained, 100)
        self.assertEqual([item["index"] for item in report.results], list(range(100)))
        self.assertGreater(report.chunks, 4)

    def test_1001_rejected(self):
        with self.assertRaises(ValueError):
            analyze_role_bulk(["She reads the report."] * 1001)

    def test_oversized_total_rejected(self):
        with self.assertRaises(ValueError):
            analyze_role_bulk(["x" * 300] * 1000)

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            analyze_role_bulk([])

    def test_invalid_types_rejected(self):
        with self.assertRaises(ValueError):
            analyze_role_bulk(["She reads the report.", None])

    def test_aggregate_scope(self):
        summary = role_bulk_summary(["She reads the report."] * 1000)
        self.assertEqual(summary["total"], 1000)
        self.assertFalse(summary["raw_text_exposed"])
        self.assertFalse(summary["production_authorized"])
        self.assertFalse(summary["open_domain_understanding_proven"])


if __name__ == "__main__":
    unittest.main()
