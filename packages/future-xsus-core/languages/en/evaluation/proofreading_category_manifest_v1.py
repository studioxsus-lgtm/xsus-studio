"""Signed category assignments for a fixed labeled dataset."""
from hashlib import sha256
import hmac
import json
import re

from .proofreading_category_quality_v1 import CategoryCaseV1, evaluate_proofreading_categories_v1

_CONTRACT = "future-xsus-core.proofreading-category-manifest.v1"
_HEX64 = re.compile(r"[0-9a-f]{64}\Z")


def _validate_key(key):
    if type(key) is not bytes or len(key) < 32:
        raise ValueError("Signing key must be at least 32 bytes")


def _validate_digest(digest):
    if type(digest) is not str or not _HEX64.fullmatch(digest):
        raise ValueError("Lowercase SHA-256 required")


def _canonical(payload):
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def create_proofreading_category_manifest_v1(dataset_sha256, categories, secret_key):
    _validate_key(secret_key)
    _validate_digest(dataset_sha256)
    if type(categories) not in (tuple, list) or not 1 <= len(categories) <= 10000:
        raise ValueError("Nonempty bounded category list required")
    seen = set()
    assignments = []
    for item in categories:
        if (not isinstance(item, CategoryCaseV1)
                or type(item.case_id) is not str or not 1 <= len(item.case_id) <= 128
                or item.case_id in seen or type(item.category) is not str
                or not re.fullmatch(r"[a-z][a-z0-9_]{0,63}", item.category)):
            raise ValueError("Invalid category assignment")
        seen.add(item.case_id)
        assignments.append({"case_id": item.case_id, "category": item.category})
    payload = {
        "contract": _CONTRACT, "dataset_sha256": dataset_sha256,
        "assignments": sorted(assignments, key=lambda row: row["case_id"]),
        "release_authorized": False,
    }
    return {**payload, "signature": hmac.new(secret_key, _canonical(payload), sha256).hexdigest()}


def verify_proofreading_category_manifest_v1(manifest, secret_key):
    _validate_key(secret_key)
    if type(manifest) is not dict or set(manifest) != {
        "contract", "dataset_sha256", "assignments", "release_authorized", "signature"
    }:
        raise ValueError("Invalid manifest schema")
    if manifest["contract"] != _CONTRACT or manifest["release_authorized"] is not False:
        raise ValueError("Invalid manifest contract")
    _validate_digest(manifest["signature"])
    assignments = manifest["assignments"]
    if type(assignments) is not list or any(
        type(row) is not dict or set(row) != {"case_id", "category"} for row in assignments
    ):
        raise ValueError("Invalid manifest assignments")
    rebuilt = create_proofreading_category_manifest_v1(
        manifest["dataset_sha256"],
        [CategoryCaseV1(row["case_id"], row["category"]) for row in assignments],
        secret_key,
    )
    if assignments != rebuilt["assignments"]:
        raise ValueError("Noncanonical manifest ordering")
    if not hmac.compare_digest(manifest["signature"], rebuilt["signature"]):
        raise ValueError("Manifest signature invalid")
    return tuple(CategoryCaseV1(row["case_id"], row["category"]) for row in assignments)


def evaluate_signed_proofreading_categories_v1(
    comparison, manifest, secret_key, *, thresholds=None, default_threshold=None
):
    categories = verify_proofreading_category_manifest_v1(manifest, secret_key)
    if (type(comparison) is not dict
            or comparison.get("reference_artifact", {}).get("dataset_sha256")
            != manifest["dataset_sha256"]
            or comparison.get("candidate_artifact", {}).get("dataset_sha256")
            != manifest["dataset_sha256"]
            or comparison.get("baseline_artifact", {}).get("dataset_sha256")
            != manifest["dataset_sha256"]):
        raise ValueError("Manifest and comparison dataset mismatch")
    kwargs = {"thresholds": thresholds}
    if default_threshold is not None:
        kwargs["default_threshold"] = default_threshold
    report = evaluate_proofreading_categories_v1(comparison, categories, **kwargs)
    return {
        **report,
        "contract": "future-xsus-core.signed-proofreading-category-quality.v1",
        "category_manifest_authenticated_at_check": True,
        "signer_identity_attested": False,
        "release_authorized": False,
    }
