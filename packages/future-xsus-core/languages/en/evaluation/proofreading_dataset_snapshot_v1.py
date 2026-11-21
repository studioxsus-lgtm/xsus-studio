"""Immutable in-memory labeled dataset snapshot with authenticated digest."""
from dataclasses import dataclass
from hashlib import sha256
import hmac
import json
from pathlib import Path


@dataclass(frozen=True, slots=True)
class ProofreadingDatasetSnapshotV1:
    raw: bytes
    digest: str
    rows: tuple


def load_proofreading_dataset_snapshot_v1(path, *, max_bytes=2_000_000, max_cases=1000):
    if not isinstance(path, Path):
        raise ValueError("Path required")
    if (type(max_bytes) is not int or not 1 <= max_bytes <= 10_000_000
            or type(max_cases) is not int or not 1 <= max_cases <= 10000):
        raise ValueError("Invalid dataset limits")
    with path.open("rb") as handle:
        raw = handle.read(max_bytes + 1)
    if not raw or len(raw) > max_bytes:
        raise ValueError("Empty or oversized dataset")
    try:
        lines = raw.decode("utf-8").splitlines()
    except UnicodeDecodeError as exc:
        raise ValueError("Dataset must be UTF-8") from exc
    if not 1 <= len(lines) <= max_cases:
        raise ValueError("Invalid case count")
    rows, seen = [], set()
    for line in lines:
        if not line.strip():
            raise ValueError("Blank lines forbidden")
        try:
            record = json.loads(line)
        except json.JSONDecodeError as exc:
            raise ValueError("Malformed JSONL") from exc
        if (type(record) is not dict or set(record) != {"id", "input", "status", "output"}
                or any(type(value) is not str for value in record.values())
                or not 1 <= len(record["id"]) <= 128
                or record["id"] in seen or not 1 <= len(record["input"]) <= 100000
                or record["status"] not in ("corrected", "unchanged", "review_required", "partial")
                or len(record["output"]) > 100000):
            raise ValueError("Invalid or duplicate dataset record")
        seen.add(record["id"])
        rows.append((record["id"], record["input"], record["status"], record["output"]))
    return ProofreadingDatasetSnapshotV1(raw, sha256(raw).hexdigest(), tuple(rows))


def verify_proofreading_dataset_snapshot_v1(snapshot, trusted_sha256):
    if not isinstance(snapshot, ProofreadingDatasetSnapshotV1):
        raise ValueError("Snapshot required")
    if (type(trusted_sha256) is not str or len(trusted_sha256) != 64
            or any(ch not in "0123456789abcdef" for ch in trusted_sha256)):
        raise ValueError("Trusted lowercase SHA-256 required")
    actual = sha256(snapshot.raw).hexdigest()
    if not hmac.compare_digest(actual, snapshot.digest):
        raise ValueError("Snapshot digest inconsistent")
    if not hmac.compare_digest(actual, trusted_sha256):
        raise ValueError("Dataset does not match trusted fingerprint")
    return True
