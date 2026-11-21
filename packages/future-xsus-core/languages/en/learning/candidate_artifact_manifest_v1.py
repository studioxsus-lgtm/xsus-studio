"""Immutable-by-contract artifact digest manifest; not a provenance signature."""
from pathlib import Path
import hashlib
import json
from .candidate_artifact_inspection_v1 import (
    CandidateArtifactInspectionRequestV1, inspect_candidate_artifacts_v1,
)


def _canonical(value):
    return json.dumps(value,sort_keys=True,separators=(",",":"),allow_nan=False).encode("utf-8")


def build_candidate_artifact_manifest_v1(request: CandidateArtifactInspectionRequestV1):
    """Produce a manifest in memory; caller decides how to store it."""
    inspection=inspect_candidate_artifacts_v1(request)
    if not inspection["all_present"]:
        raise ValueError("All artifacts must be present and safe")
    records=inspection["artifacts"]
    payload={
        "contract":"future-xsus-core.candidate-artifact-manifest.v1",
        "artifacts":{key:{"sha256":records[key]["sha256"],"size":records[key]["size"]}
                     for key in ("candidate","report","training")},
    }
    return {**payload,"manifest_sha256":hashlib.sha256(_canonical(payload)).hexdigest()}


def verify_candidate_artifact_manifest_v1(
        request: CandidateArtifactInspectionRequestV1,manifest: dict):
    """Recompute current file hashes and compare against a supplied manifest."""
    if type(manifest) is not dict or set(manifest)!={"contract","artifacts","manifest_sha256"}:
        raise ValueError("Invalid manifest structure")
    if manifest["contract"]!="future-xsus-core.candidate-artifact-manifest.v1":
        raise ValueError("Invalid manifest contract")
    records=manifest["artifacts"]
    if type(records) is not dict or set(records)!={"candidate","report","training"}:
        raise ValueError("Invalid artifact manifest entries")
    for item in records.values():
        if (type(item) is not dict or set(item)!={"sha256","size"}
                or type(item["sha256"]) is not str or len(item["sha256"])!=64
                or any(ch not in "0123456789abcdef" for ch in item["sha256"])
                or type(item["size"]) is not int or item["size"]<0):
            raise ValueError("Invalid artifact manifest digest")
    digest=manifest["manifest_sha256"]
    if type(digest) is not str or len(digest)!=64 or any(ch not in "0123456789abcdef" for ch in digest):
        raise ValueError("Invalid manifest checksum")
    payload={"contract":manifest["contract"],"artifacts":records}
    manifest_consistent=hashlib.sha256(_canonical(payload)).hexdigest()==digest
    current=inspect_candidate_artifacts_v1(request)
    matches=manifest_consistent and current["all_present"] and all(
        current["artifacts"][name]["sha256"]==records[name]["sha256"]
        and current["artifacts"][name]["size"]==records[name]["size"]
        for name in records
    )
    return {
        "contract":"future-xsus-core.candidate-artifact-verification.v1",
        "manifest_consistent":manifest_consistent,
        "artifact_digests_match":bool(matches),
        "requires_manual_review":True,
        "provenance_authenticated":False,
        "model_quality_verified":False,
        "release_authorized":False,
    }
