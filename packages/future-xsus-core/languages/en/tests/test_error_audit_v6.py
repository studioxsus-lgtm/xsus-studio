import json
import unittest
from languages.en.evaluation.document_benchmark_v6 import DocumentCaseV6
from languages.en.evaluation.error_audit_v6 import (
    ADVERSARIAL_CASES_V6, audit_document_errors_v6,
)


class ErrorAuditV6Tests(unittest.TestCase):
    def test_adversarial_case_count(self):
        self.assertEqual(audit_document_errors_v6(ADVERSARIAL_CASES_V6)["cases"], 5)

    def test_detects_contrast_false_positive(self):
        result = audit_document_errors_v6(ADVERSARIAL_CASES_V6)
        self.assertEqual(result["confusion"]["has_contrast"]["fp"], 1)

    def test_detects_reference_false_positive(self):
        result = audit_document_errors_v6(ADVERSARIAL_CASES_V6)
        self.assertEqual(result["confusion"]["has_reference"]["fp"], 1)

    def test_detects_true_positives(self):
        result = audit_document_errors_v6(ADVERSARIAL_CASES_V6)
        self.assertEqual(result["confusion"]["has_contrast"]["tp"], 1)
        self.assertEqual(result["confusion"]["has_reference"]["tp"], 1)

    def test_precision_with_false_positive(self):
        result = audit_document_errors_v6(ADVERSARIAL_CASES_V6)
        self.assertEqual(result["confusion"]["has_contrast"]["precision"], 0.5)

    def test_recall_with_no_false_negatives(self):
        result = audit_document_errors_v6(ADVERSARIAL_CASES_V6)
        self.assertEqual(result["confusion"]["has_reference"]["recall"], 1.0)

    def test_failure_details(self):
        result = audit_document_errors_v6(ADVERSARIAL_CASES_V6)
        self.assertEqual({f["case"] for f in result["failures"]},
                         {"contrast_literal", "reference_literal"})

    def test_undefined_precision_is_null(self):
        case = DocumentCaseV6("negative", "Birds migrate.", 1, 1, False, False)
        result = audit_document_errors_v6((case,))
        self.assertIsNone(result["confusion"]["has_contrast"]["precision"])

    def test_undefined_recall_is_null(self):
        case = DocumentCaseV6("negative", "Birds migrate.", 1, 1, False, False)
        result = audit_document_errors_v6((case,))
        self.assertIsNone(result["confusion"]["has_reference"]["recall"])

    def test_json_serializable(self):
        json.dumps(audit_document_errors_v6(ADVERSARIAL_CASES_V6))

    def test_deterministic(self):
        self.assertEqual(audit_document_errors_v6(ADVERSARIAL_CASES_V6),
                         audit_document_errors_v6(ADVERSARIAL_CASES_V6))

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            audit_document_errors_v6(())

    def test_invalid_case_rejected(self):
        with self.assertRaises(ValueError):
            audit_document_errors_v6(("invalid",))

    def test_duplicate_name_rejected(self):
        case = DocumentCaseV6("same", "Birds migrate.", 1, 1, False, False)
        with self.assertRaises(ValueError):
            audit_document_errors_v6((case, case))

    def test_bad_boolean_label_rejected(self):
        case = DocumentCaseV6("bad", "Birds migrate.", 1, 1, 0, False)
        with self.assertRaises(ValueError):
            audit_document_errors_v6((case,))

    def test_does_not_claim_semantics(self):
        self.assertFalse(audit_document_errors_v6(ADVERSARIAL_CASES_V6)["evaluates_semantics"])
