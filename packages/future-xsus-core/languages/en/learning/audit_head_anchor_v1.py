"""Signed audit-chain head checkpoints; caller controls off-database storage.

HMAC key must be independently managed and never stored in the chain DB.
"""
from dataclasses import dataclass
import hashlib
import hmac
import json
import re

from .audit_hash_chain_v1 import SQLiteAuditHashChainV1
from .candidate_registry_v1 import SQLiteCandidateRegistryV1

_HEX = re.compile(r"^[a-f0-9]{64}$")
_CONTRACT = "future-xsus-core.audit-head-anchor.v1"


def _key(key):
    if type(key) is not bytes or len(key) < 32:
        raise ValueError("Independent HMAC key of at least 32 bytes required")
    return key


def _payload(owner, candidate, count, head):
    return {"contract": _CONTRACT, "owner_id": owner, "candidate_id": candidate,
            "event_count": count, "head": head}


def _serialize(data):
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def create_audit_head_anchor_v1(chain: SQLiteAuditHashChainV1, owner_id: str,
                                candidate_id: str, secret_key: bytes) -> dict:
    _key(secret_key)
    if not isinstance(chain, SQLiteAuditHashChainV1):
        raise ValueError("Chain instance required")
    SQLiteCandidateRegistryV1._validate(owner_id, candidate_id)
    verified = chain.verify(owner_id, candidate_id)
    if verified["status"] != "consistent_at_check":
        raise ValueError("Cannot anchor an inconsistent or empty chain")
    payload = _payload(owner_id, candidate_id, verified["event_count"], verified["head"])
    signature = hmac.new(secret_key, _serialize(payload), hashlib.sha256).hexdigest()
    return {**payload, "signature": signature, "release_authorized": False}


def verify_audit_head_anchor_v1(chain: SQLiteAuditHashChainV1, owner_id: str,
                                candidate_id: str, anchor: dict, secret_key: bytes) -> dict:
    _key(secret_key)
    if not isinstance(chain, SQLiteAuditHashChainV1):
        raise ValueError("Chain instance required")
    SQLiteCandidateRegistryV1._validate(owner_id, candidate_id)
    reasons = []
    if type(anchor) is not dict or set(anchor) != {
        "contract", "owner_id", "candidate_id", "event_count", "head",
        "signature", "release_authorized"
    }:
        raise ValueError("Invalid anchor schema")
    count, head, signature = anchor["event_count"], anchor["head"], anchor["signature"]
    if (anchor["contract"] != _CONTRACT or type(count) is not int or count <= 0
            or type(head) is not str or not _HEX.fullmatch(head)
            or type(signature) is not str or not _HEX.fullmatch(signature)
            or anchor["release_authorized"] is not False):
        raise ValueError("Invalid anchor fields")
    if anchor["owner_id"] != owner_id or anchor["candidate_id"] != candidate_id:
        reasons.append("anchor_scope_mismatch")
    expected = hmac.new(secret_key, _serialize(_payload(
        anchor["owner_id"], anchor["candidate_id"], count, head
    )), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        reasons.append("anchor_signature_invalid")
    verified = chain.verify(owner_id, candidate_id)
    if verified["status"] != "consistent_at_check":
        reasons.append("chain_integrity_invalid")
    if verified["event_count"] != count:
        reasons.append("anchor_count_mismatch")
    if verified["head"] != head:
        reasons.append("anchor_head_mismatch")
    return {
        "contract": _CONTRACT, "candidate_id": candidate_id,
        "status": "consistent_at_check" if not reasons else "inconsistent_or_untrusted",
        "reasons": reasons, "event_count": verified["event_count"],
        "head": verified["head"], "anchor_verified_at_check": not reasons,
        "anchor_stored_externally": False, "release_authorized": False,
    }
