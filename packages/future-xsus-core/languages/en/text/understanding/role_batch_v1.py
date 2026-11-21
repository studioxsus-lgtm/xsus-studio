"""Phase 3.4 bounded batch processing for explicit grammatical roles."""
from dataclasses import dataclass

from .role_semantics_v1 import classify_sentence_roles
from .role_relations_v1 import compare_sentence_roles

_MAX_SENTENCES = 32
_MAX_PAIRS = 64
_MAX_TEXT = 8192
_MAX_SENTENCE = 1000


@dataclass(frozen=True, slots=True)
class RoleBatch:
    status: str
    total: int
    resolved: int
    abstained: int
    roles: tuple[dict, ...]


def _validate_sentences(sentences: list[str] | tuple[str, ...]) -> tuple[str, ...]:
    if not isinstance(sentences, (list, tuple)) or not 1 <= len(sentences) <= _MAX_SENTENCES:
        raise ValueError("sentences must be a nonempty list or tuple of at most 32")
    if any(not isinstance(s, str) or not s.strip() or len(s) > _MAX_SENTENCE for s in sentences):
        raise ValueError("each sentence must be a nonempty string of at most 1000 characters")
    if sum(len(s) for s in sentences) > _MAX_TEXT:
        raise ValueError("total sentence text exceeds 8192 characters")
    return tuple(sentences)


def analyze_role_batch(sentences: list[str] | tuple[str, ...]) -> RoleBatch:
    items = _validate_sentences(sentences)
    roles = []
    resolved = 0
    for index, sentence in enumerate(items):
        frame = classify_sentence_roles(sentence)
        resolved += frame.status == "resolved"
        roles.append({
            "index": index, "status": frame.status,
            "subject": frame.subject, "subject_kind": frame.subject_kind,
            "action": frame.action, "object": frame.object,
            "object_kind": frame.object_kind, "polarity": frame.polarity,
            "reasons": frame.reasons,
        })
    return RoleBatch("completed", len(items), resolved, len(items) - resolved,
                     tuple(roles))


def compare_role_batch_pairs(
    sentences: list[str] | tuple[str, ...],
    pairs: list[tuple[int, int]] | tuple[tuple[int, int], ...],
) -> dict:
    items = _validate_sentences(sentences)
    if not isinstance(pairs, (list, tuple)) or len(pairs) > _MAX_PAIRS:
        raise ValueError("pairs must be a list or tuple of at most 64")
    seen = set()
    results = []
    for pair in pairs:
        if (not isinstance(pair, (list, tuple)) or len(pair) != 2
                or any(type(i) is not int or not 0 <= i < len(items) for i in pair)
                or pair[0] == pair[1] or tuple(pair) in seen):
            raise ValueError("invalid or repeated role comparison pair")
        seen.add(tuple(pair))
        result = compare_sentence_roles(items[pair[0]], items[pair[1]])
        results.append({
            "indices": tuple(pair), "status": result.status,
            "relation": result.relation, "reasons": result.reasons,
        })
    return {
        "contract": "future-xsus-core.role-batch-pairs.v1",
        "count": len(results), "pairs": tuple(results),
        "production_authorized": False, "event_identity_proven": False,
    }
