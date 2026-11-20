"""Opt-in scope-aware entrypoint for English candidate training.

Does not alter the legacy build_candidate API. Declared domain metadata
is not a semantic classifier or a substitute for reviewer authentication.
"""
from .continual import build_candidate
from .feedback_store import SQLiteFeedbackStore
from .language_scope_v1 import (
    LanguageLearningProposalV1, assess_language_learning_scope_v1,
)


def build_scoped_language_candidate_v1(
    store: SQLiteFeedbackStore, owner_id: str, *,
    domain: str, source: str, human_approved: bool, **training_options
) -> dict:
    """Reject out-of-scope declarations before calling existing training."""
    if not isinstance(store, SQLiteFeedbackStore):
        raise ValueError("A persistent SQLiteFeedbackStore is required")
    if type(owner_id) is not str or not owner_id.strip():
        raise ValueError("A nonempty owner_id is required")
    proposal = LanguageLearningProposalV1(
        language="en", domain=domain, source=source,
        human_approved=human_approved,
    )
    scope = assess_language_learning_scope_v1(proposal)
    if not scope["accepted_for_candidate_preflight"]:
        raise ValueError("Language learning preflight rejected: " + ",".join(scope["reasons"]))
    # Only human-reviewed examples can reach build_candidate, which
    # separately enforces a minimum count and holdout non-regression.
    if len(store.accepted(owner_id)) < 5:
        raise ValueError("At least five accepted feedback examples are required")
    report = build_candidate(store, owner_id, **training_options)
    return {
        "contract": "future-xsus-core.scoped-language-candidate.v1",
        "scope": scope,
        "candidate": report,
        "automatic_promotion_authorized": False,
        "semantic_scope_verified": False,
    }
