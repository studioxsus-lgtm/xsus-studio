"""Explicit, fail-closed learning-scope policy for Future XSUS Core.

This is an opt-in preflight policy. It does not classify arbitrary text
semantically or change the existing continual-learning training path.
"""
from dataclasses import dataclass

_ALLOWED = frozenset({
    "grammar", "morphology", "syntax", "vocabulary",
    "orthography", "punctuation", "language_usage",
})
_ALLOWED_SOURCES = frozenset({"consented_feedback", "curated_corpus"})
_ALLOWED_LANGUAGES = frozenset({"en"})


@dataclass(frozen=True, slots=True)
class LanguageLearningProposalV1:
    language: str
    domain: str
    source: str
    human_approved: bool


def assess_language_learning_scope_v1(proposal: LanguageLearningProposalV1) -> dict:
    """Validate declared metadata; never infer safety from untrusted text."""
    if not isinstance(proposal, LanguageLearningProposalV1):
        raise ValueError("Expected LanguageLearningProposalV1")
    if any(type(value) is not str for value in (
        proposal.language, proposal.domain, proposal.source
    )) or type(proposal.human_approved) is not bool:
        raise ValueError("Invalid proposal field type")
    reasons = []
    if proposal.language not in _ALLOWED_LANGUAGES:
        reasons.append("language_engine_not_enabled")
    if proposal.domain not in _ALLOWED:
        reasons.append("learning_domain_out_of_scope")
    if proposal.source not in _ALLOWED_SOURCES:
        reasons.append("source_not_approved")
    if not proposal.human_approved:
        reasons.append("human_review_required")
    return {
        "contract": "future-xsus-core.language-learning-scope.v1",
        "accepted_for_candidate_preflight": not reasons,
        "reasons": reasons,
        "language": proposal.language,
        "domain": proposal.domain,
        "production_activation_authorized": False,
        "semantic_content_verified": False,
        "self_modifying_code_authorized": False,
    }
