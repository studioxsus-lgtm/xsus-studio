import unittest
from unittest.mock import patch
from languages.en.learning.candidate_quarantine_v1 import (
    decide_candidate_quarantine_v1 as decide,
    assess_language_candidate_v1 as assess,
)


def report(**changes):
    data = {
        "contract": "future-xsus-core.revocation-gate.v1",
        "feedback_unchanged_at_completion": True,
        "candidate_snapshot_matches": True,
        "eligible_for_human_review": True,
        "reasons": [],
        "automatic_promotion_authorized": False,
        "production_activation_authorized": False,
    }
    data.update(changes)
    return data


class CandidateQuarantineV1Tests(unittest.TestCase):
    def test_valid_pending_review(self):
        self.assertEqual(decide(report()).status, "pending_human_review")

    def test_valid_never_released(self):
        self.assertFalse(decide(report()).release_authorized)

    def test_human_review_required(self):
        self.assertTrue(decide(report()).human_review_required)

    def test_invalid_none(self):
        self.assertEqual(decide(None).status, "quarantined")

    def test_invalid_empty(self):
        self.assertEqual(decide({}).status, "quarantined")

    def test_invalid_contract(self):
        self.assertEqual(decide(report(contract="wrong")).status, "quarantined")

    def test_revoked_feedback(self):
        self.assertEqual(decide(report(feedback_unchanged_at_completion=False)).status, "quarantined")

    def test_snapshot_mismatch(self):
        self.assertEqual(decide(report(candidate_snapshot_matches=False)).status, "quarantined")

    def test_not_eligible(self):
        self.assertEqual(decide(report(eligible_for_human_review=False)).status, "quarantined")

    def test_supplied_reasons_quarantine(self):
        result = decide(report(reasons=["approved_feedback_changed"]))
        self.assertIn("approved_feedback_changed", result.reasons)

    def test_invalid_reasons_type(self):
        self.assertEqual(decide(report(reasons="none")).status, "quarantined")

    def test_invalid_reasons_member(self):
        self.assertEqual(decide(report(reasons=[1])).status, "quarantined")

    def test_auto_promotion_flag(self):
        self.assertEqual(decide(report(automatic_promotion_authorized=True)).status, "quarantined")

    def test_missing_auto_promotion_flag(self):
        self.assertEqual(decide(report(automatic_promotion_authorized=None)).status, "quarantined")

    def test_production_activation_flag(self):
        self.assertEqual(decide(report(production_activation_authorized=True)).status, "quarantined")

    def test_missing_activation_flag(self):
        self.assertEqual(decide(report(production_activation_authorized=None)).status, "quarantined")

    def test_no_filesystem_quarantine_claim(self):
        self.assertFalse(decide(report()).artifact_quarantined_on_disk)

    def test_assess_calls_revocation_gate(self):
        with patch("languages.en.learning.candidate_quarantine_v1.build_revocation_checked_candidate_v1",
                   return_value=report()) as train:
            result = assess(object(), "alice", domain="grammar", epochs=2)
        train.assert_called_once_with(unittest.mock.ANY, "alice", domain="grammar", epochs=2)
        self.assertEqual(result["status"], "pending_human_review")

    def test_assess_quarantines_failure(self):
        with patch("languages.en.learning.candidate_quarantine_v1.build_revocation_checked_candidate_v1",
                   return_value=report(reasons=["revoked"])):
            result = assess(object(), "alice", domain="grammar")
        self.assertEqual(result["status"], "quarantined")

    def test_assess_does_not_authorize_release(self):
        with patch("languages.en.learning.candidate_quarantine_v1.build_revocation_checked_candidate_v1",
                   return_value=report()):
            result = assess(object(), "alice", domain="grammar")
        self.assertFalse(result["release_authorized"])

    def test_reason_deduplication(self):
        result = decide(report(reasons=["candidate_not_eligible", "candidate_not_eligible"],
                               eligible_for_human_review=False))
        self.assertEqual(result.reasons.count("candidate_not_eligible"), 1)
