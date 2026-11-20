"""Owner-scoped verified feedback preflight for English candidate learning.

Verification reads actual SQLite review status. It never accepts a
caller-supplied 'approved' boolean as evidence of review.
"""
from dataclasses import dataclass
from .feedback_store import SQLiteFeedbackStore
from .language_scope_v1 import (
    LanguageLearningProposalV1, assess_language_learning_scope_v1,
)


@dataclass(frozen=True, slots=True)
class VerifiedFeedbackRequestV1:
    owner_id: str
    example_ids: tuple[str, ...]
    domain: str


def verify_approved_language_feedback_v1(
    store: SQLiteFeedbackStore, request: VerifiedFeedbackRequestV1
) -> dict:
    if not isinstance(store, SQLiteFeedbackStore):
        raise ValueError("Persistent SQLiteFeedbackStore required")
    if not isinstance(request, VerifiedFeedbackRequestV1):
        raise ValueError("VerifiedFeedbackRequestV1 required")
    if type(request.owner_id) is not str or not request.owner_id.strip():
        raise ValueError("Valid owner_id required")
    if type(request.example_ids) is not tuple or not request.example_ids:
        raise ValueError("Nonempty tuple of example IDs required")
    if any(type(item) is not str for item in request.example_ids):
        raise ValueError("Example IDs must be strings")
    if len(set(request.example_ids)) != len(request.example_ids):
        raise ValueError("Duplicate example IDs are not allowed")
    if len(request.example_ids) > 10000:
        raise ValueError("Too many example IDs")
    scope = assess_language_learning_scope_v1(
        LanguageLearningProposalV1(
            language="en", domain=request.domain,
            source="consented_feedback", human_approved=True,
        )
    )
    if not scope["accepted_for_candidate_preflight"]:
        raise ValueError("Language learning scope rejected: " + ",".join(scope["reasons"]))
    # Status is read from owner-scoped records; pending/rejected IDs
    # cannot be used even if the caller claims they are approved.
    for example_id in request.example_ids:
        record = store.get(request.owner_id, example_id)
        if record.status != "accepted":
            raise ValueError("Feedback example is not approved")
    return {
        "contract": "future-xsus-core.verified-language-feedback.v1",
        "approved_example_count": len(request.example_ids),
        "language": "en",
        "domain": request.domain,
        "approved_from_persistent_store": True,
        "training_started": False,
        "production_activation_authorized": False,
        "semantic_scope_verified": False,
    }
