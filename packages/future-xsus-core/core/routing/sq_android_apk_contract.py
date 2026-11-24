"""Android build handoff and artifact integrity checks; no compiler invocation."""
from dataclasses import asdict
import hashlib
import json
from core.routing.sq_android_persistence_security import PersistenceSecurityPlan

def prepare_apk_request(plan: PersistenceSecurityPlan) -> dict:
    if not isinstance(plan, PersistenceSecurityPlan):
        raise TypeError("Expected persistence and security plan")
    if plan.unresolved:
        raise ValueError("Unresolved requirements")
    snapshot = json.loads(json.dumps(asdict(plan), ensure_ascii=False))
    digest = hashlib.sha256(json.dumps(snapshot, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")).hexdigest()
    return {"schema_version":"1.0","operation":"android.build.debug",
            "plan_digest":digest,"plan":snapshot,"gradle_task":":app:assembleDebug",
            "execution_authorized":False}

def verify_artifact_integrity(request: dict, receipt: dict, artifact: bytes) -> dict:
    """Check receipt binding and bytes only, not APK validity or signing."""
    if not isinstance(receipt, dict) or set(receipt) != {"plan_digest","status","sha256","size","kind"}:
        raise ValueError("Invalid receipt")
    if receipt["plan_digest"] != request["plan_digest"] or receipt["status"] != "completed" or receipt["kind"] != "apk":
        raise ValueError("Receipt mismatch")
    if not isinstance(artifact, bytes) or not 1 <= len(artifact) <= 128*1024*1024:
        raise ValueError("Invalid artifact size")
    if type(receipt["size"]) is not int or receipt["size"] != len(artifact):
        raise ValueError("Size mismatch")
    digest = hashlib.sha256(artifact).hexdigest()
    if receipt["sha256"] != digest:
        raise ValueError("Digest mismatch")
    return {"sha256":digest,"size":len(artifact),"integrity_matches":True,
            "apk_validated":False,"signature_verified":False,"installation_verified":False,
            "execution_authorized":False}
