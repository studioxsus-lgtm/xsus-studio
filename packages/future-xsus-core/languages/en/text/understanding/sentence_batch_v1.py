"""Phase 2 opt-in bounded batch analysis; no actions, I/O or user text retention.

This is NOT a general document parser. Each item is an independently
validated single sentence from the controlled English grammar.
"""
from dataclasses import dataclass

from .sentence_meaning_v1 import analyze_sentence_meaning
from .sentence_relations_v1 import compare_sentence_frames

MAX_SENTENCES = 32
MAX_TOTAL_CHARS = 8192
MAX_PAIRS = 64


@dataclass(frozen=True, slots=True)
class BatchSummary:
    total: int
    resolved: int
    abstained: int
    positive: int
    negative: int


def _validated_sentences(sentences: object) -> tuple[str, ...]:
    if not isinstance(sentences, (list, tuple)):
        raise ValueError("sentences must be a list or tuple")
    if not 1 <= len(sentences) <= MAX_SENTENCES:
        raise ValueError("sentence count outside allowed bounds")
    if any(not isinstance(item, str) or not item.strip() for item in sentences):
        raise ValueError("all sentences must be nonempty strings")
    if sum(len(item) for item in sentences) > MAX_TOTAL_CHARS:
        raise ValueError("total sentence characters exceed limit")
    return tuple(sentences)


def analyze_sentence_batch(sentences: object) -> dict:
    items = _validated_sentences(sentences)
    results = tuple(analyze_sentence_meaning(item) for item in items)
    summary = BatchSummary(
        total=len(results),
        resolved=sum(item.status == "resolved" for item in results),
        abstained=sum(item.status == "abstained" for item in results),
        positive=sum(item.polarity == "positive" for item in results),
        negative=sum(item.polarity == "negative" for item in results),
    )
    return {
        "contract": "future-xsus-core.sentence-batch.v1",
        "summary": {
            "total": summary.total,
            "resolved": summary.resolved,
            "abstained": summary.abstained,
            "positive": summary.positive,
            "negative": summary.negative,
        },
        "items": [
            {
                "index": index,
                "status": frame.status,
                "subject": frame.subject,
                "action": frame.action,
                "object": frame.object,
                "polarity": frame.polarity,
                "reasons": frame.reasons,
            }
            for index, frame in enumerate(results)
        ],
        "production_authorized": False,
        "document_understanding_proven": False,
    }


def compare_sentence_batch_pairs(sentences: object, pairs: object) -> dict:
    items = _validated_sentences(sentences)
    if not isinstance(pairs, (list, tuple)) or not 1 <= len(pairs) <= MAX_PAIRS:
        raise ValueError("pairs must contain 1 to 64 index pairs")
    normalized = []
    for pair in pairs:
        if (not isinstance(pair, (list, tuple)) or len(pair) != 2
                or any(type(i) is not int or i < 0 or i >= len(items) for i in pair)):
            raise ValueError("invalid sentence pair indices")
        normalized.append(tuple(pair))
    results = [compare_sentence_frames(items[left], items[right]) for left, right in normalized]
    return {
        "contract": "future-xsus-core.sentence-batch-relations.v1",
        "total_pairs": len(results),
        "resolved": sum(result.status == "resolved" for result in results),
        "abstained": sum(result.status == "abstained" for result in results),
        "relations": [
            {
                "pair_index": index,
                "left_index": pair[0],
                "right_index": pair[1],
                "status": result.status,
                "relation": result.relation,
                "reasons": result.reasons,
            }
            for index, (pair, result) in enumerate(zip(normalized, results))
        ],
        "production_authorized": False,
        "logical_contradiction_proven": False,
    }
