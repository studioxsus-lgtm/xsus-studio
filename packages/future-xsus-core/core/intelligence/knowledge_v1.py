"""Owner-scoped, bounded knowledge snapshots with provenance and explicit conflicts.

This is a local knowledge component, not a fact checker or autonomous web agent.
"""
from dataclasses import dataclass
from hashlib import sha256
import re

_ID = re.compile(r"^[a-z][a-z0-9_-]{0,63}$")
MAX_RECORDS = 512
MAX_TEXT = 2000


def _id(value):
    if not isinstance(value, str) or not _ID.fullmatch(value):
        raise ValueError("invalid identifier")
    return value


def _text(value):
    if not isinstance(value, str) or not value.strip() or len(value) > MAX_TEXT:
        raise ValueError("invalid text")
    return value.strip()


@dataclass(frozen=True, slots=True)
class Evidence:
    source_id: str
    excerpt: str
    digest: str

    @classmethod
    def from_excerpt(cls, source_id: str, excerpt: str):
        source_id, excerpt = _id(source_id), _text(excerpt)
        return cls(source_id, excerpt, sha256(excerpt.encode("utf-8")).hexdigest())

    def valid(self):
        return (isinstance(self.source_id, str)
                and bool(_ID.fullmatch(self.source_id))
                and isinstance(self.excerpt, str)
                and 0 < len(self.excerpt) <= MAX_TEXT
                and isinstance(self.digest, str)
                and self.digest == sha256(self.excerpt.encode("utf-8")).hexdigest())


@dataclass(frozen=True, slots=True)
class KnowledgeRecord:
    key: str
    value: str
    evidence: Evidence
    owner_id: str

    def __post_init__(self):
        _id(self.key)
        _id(self.owner_id)
        _text(self.value)
        if not isinstance(self.evidence, Evidence) or not self.evidence.valid():
            raise ValueError("invalid evidence")


@dataclass(frozen=True, slots=True)
class KnowledgeAnswer:
    status: str
    key: str
    value: str | None
    sources: tuple[str, ...]
    evidence_digests: tuple[str, ...]
    verified: bool
    limitations: tuple[str, ...]


class KnowledgeStore:
    def __init__(self, records: tuple[KnowledgeRecord, ...] = ()):
        if not isinstance(records, tuple) or len(records) > MAX_RECORDS:
            raise ValueError("knowledge store exceeds record limit")
        if any(not isinstance(r, KnowledgeRecord) for r in records):
            raise ValueError("invalid record")
        self._records = records

    def query(self, owner_id: str, key: str) -> KnowledgeAnswer:
        owner_id, key = _id(owner_id), _id(key)
        matches = tuple(r for r in self._records
                        if r.owner_id == owner_id and r.key == key)
        if not matches:
            return KnowledgeAnswer("unknown", key, None, (), (), False,
                                   ("no_matching_evidence",))
        values = {r.value for r in matches}
        sources = tuple(sorted({r.evidence.source_id for r in matches}))
        digests = tuple(sorted({r.evidence.digest for r in matches}))
        if len(values) != 1:
            return KnowledgeAnswer("conflict", key, None, sources, digests, False,
                                   ("conflicting_values_require_review",))
        return KnowledgeAnswer("supported", key, next(iter(values)), sources,
                               digests, False,
                               ("source_integrity_is_not_external_truth_verification",))

    def add(self, record: KnowledgeRecord):
        if not isinstance(record, KnowledgeRecord):
            raise ValueError("invalid record")
        if len(self._records) >= MAX_RECORDS:
            raise ValueError("knowledge store full")
        return KnowledgeStore(self._records + (record,))

    def records_for_owner(self, owner_id: str):
        owner_id = _id(owner_id)
        return tuple(r for r in self._records if r.owner_id == owner_id)
