import json
import unittest
from languages.en.evaluation.document_benchmark_v6 import (
    CASES_V6, DocumentCaseV6, evaluate_documents_v6,
)


class DocumentBenchmarkV6Tests(unittest.TestCase):
    def test_default_count(self):
        self.assertEqual(evaluate_documents_v6()["cases"], len(CASES_V6))

    def test_four_fields(self):
        self.assertEqual(evaluate_documents_v6()["fields_per_case"], 4)

    def test_default_gold_labels(self):
        result = evaluate_documents_v6()
        self.assertEqual(result["failures"], [])
        self.assertEqual(result["overall_accuracy"], 1.0)

    def test_field_scores(self):
        self.assertTrue(all(value == 1.0 for value in
                            evaluate_documents_v6()["field_accuracy"].values()))

    def test_json_serializable(self):
        json.dumps(evaluate_documents_v6())

    def test_deterministic(self):
        self.assertEqual(evaluate_documents_v6(), evaluate_documents_v6())

    def test_explicit_scope(self):
        self.assertFalse(evaluate_documents_v6()["general_language_understanding"])

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            evaluate_documents_v6(())

    def test_invalid_case_rejected(self):
        with self.assertRaises(ValueError):
            evaluate_documents_v6(("invalid",))

    def test_custom_single_case(self):
        case = DocumentCaseV6("custom", "The report arrived.", 1, 1, False, False)
        self.assertEqual(evaluate_documents_v6((case,))["overall_accuracy"], 1.0)

    def test_incorrect_label_reports_failure(self):
        case = DocumentCaseV6("wrong", "The report arrived.", 2, 1, False, False)
        result = evaluate_documents_v6((case,))
        self.assertEqual(len(result["failures"]), 1)
        self.assertEqual(result["failures"][0]["field"], "paragraph_count")
        self.assertEqual(result["overall_accuracy"], 0.75)

    def test_incorrect_reference_label(self):
        case = DocumentCaseV6("wrong_reference", "She arrived.", 1, 1, False, False)
        result = evaluate_documents_v6((case,))
        self.assertEqual(result["failures"][0]["field"], "has_reference")

    def test_incorrect_contrast_label(self):
        case = DocumentCaseV6("wrong_contrast", "However, the report arrived.", 1, 1, False, False)
        result = evaluate_documents_v6((case,))
        self.assertEqual(result["failures"][0]["field"], "has_contrast")

    def test_multiple_wrong_labels(self):
        case = DocumentCaseV6("wrong", "The report arrived.", 2, 2, True, True)
        self.assertEqual(len(evaluate_documents_v6((case,))["failures"]), 4)

    def test_custom_two_cases(self):
        result = evaluate_documents_v6(CASES_V6[:2])
        self.assertEqual(result["cases"], 2)
        self.assertEqual(result["overall_accuracy"], 1.0)

    def test_scores_in_range(self):
        result = evaluate_documents_v6()
        self.assertGreaterEqual(result["overall_accuracy"], 0)
        self.assertLessEqual(result["overall_accuracy"], 1)

    def test_no_mutation_of_gold(self):
        before = CASES_V6
        evaluate_documents_v6()
        self.assertEqual(CASES_V6, before)

    def test_failure_records_expected_and_actual(self):
        case = DocumentCaseV6("wrong", "The report arrived.", 2, 1, False, False)
        failure = evaluate_documents_v6((case,))["failures"][0]
        self.assertEqual(failure["expected"], 2)
        self.assertEqual(failure["actual"], 1)
