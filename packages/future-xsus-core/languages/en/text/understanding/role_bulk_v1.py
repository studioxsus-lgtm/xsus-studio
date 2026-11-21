"""Phase 3.5 opt-in bounded processing of up to 1000 controlled sentences.

Chunked execution preserves per-sentence abstention and ordering. The API
does not imply understanding of 1000 distinct linguistic constructions.
"""
from dataclasses import dataclass

from .role_batch_v1 import analyze_role_batch

_MAX_ITEMS = 1000
_CHUNK_SIZE = 32
_MAX_TOTAL_CHARS = 256000
_MAX_SENTENCE_CHARS = 1000


@dataclass(frozen=True, slots=True)
class RoleBulkReport:
    status: str
    total: int
    resolved: int
    abstained: int
    chunks: int
    results: tuple[dict, ...]


def analyze_role_bulk(sentences: list[str] | tuple[str, ...]) -> RoleBulkReport:
    if not isinstance(sentences, (list, tuple)) or not 1 <= len(sentences) <= _MAX_ITEMS:
        raise ValueError("sentences must contain 1 to 1000 entries")
    if any(type(s) is not str or not s.strip() or len(s) > _MAX_SENTENCE_CHARS
           for s in sentences):
        raise ValueError("each sentence must be nonempty and at most 1000 characters")
    if sum(len(s) for s in sentences) > _MAX_TOTAL_CHARS:
        raise ValueError("total input exceeds 256000 characters")
    results = []
    resolved = 0
    chunks = 0
    for offset in range(0, len(sentences), _CHUNK_SIZE):
        # The existing 8192-character batch budget is retained.
        # Split further if the next sentence would exceed that budget.
        window = sentences[offset:offset + _CHUNK_SIZE]
        current = []
        current_size = 0
        for sentence in window:
            if current and current_size + len(sentence) > 8192:
                batch = analyze_role_batch(current)
                chunks += 1
                resolved += batch.resolved
                results.extend({**entry, "index": offset + len(results) - offset + i}
                               for i, entry in enumerate(batch.roles))
                current = []
                current_size = 0
            current.append(sentence)
            current_size += len(sentence)
        if current:
            batch = analyze_role_batch(current)
            chunks += 1
            resolved += batch.resolved
            results.extend({**entry, "index": len(results) + i}
                           for i, entry in enumerate(batch.roles))
    return RoleBulkReport("completed", len(sentences), resolved,
                          len(sentences) - resolved, chunks, tuple(results))


def role_bulk_summary(sentences: list[str] | tuple[str, ...]) -> dict:
    report = analyze_role_bulk(sentences)
    return {
        "contract": "future-xsus-core.role-bulk.v1",
        "status": report.status,
        "total": report.total,
        "resolved": report.resolved,
        "abstained": report.abstained,
        "chunks": report.chunks,
        "raw_text_exposed": False,
        "production_authorized": False,
        "open_domain_understanding_proven": False,
    }
