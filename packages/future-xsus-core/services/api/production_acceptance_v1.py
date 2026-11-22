"""Local release evidence validation; never grants production authorization."""
import math

EXTERNAL_GATES = (
    "render_deployment_verified",
    "supabase_identity_verified",
    "xsus_app_browser_e2e",
    "production_capacity_verified",
    "production_recovery_verified",
    "operational_alert_delivery_verified",
    "independent_security_review",
)

def assess_load_report(report):
    if not isinstance(report, dict) or report.get("recovery") != "pass":
        return False
    rows = report.get("scenarios")
    if not isinstance(rows, list) or len(rows) != 5:
        return False
    for row, concurrency in zip(rows, (1, 4, 8, 16, 32)):
        if not isinstance(row, dict):
            return False
        counts = [row.get(k) for k in ("concurrency", "requests", "completed", "unavailable")]
        if any(type(n) is not int for n in counts):
            return False
        c, total, completed, unavailable = counts
        if c != concurrency or total != 8*c or not 0 < completed <= total:
            return False
        if unavailable != total-completed or (c == 1 and unavailable):
            return False
        values = [row.get(k) for k in ("p50_ms", "p95_ms", "p99_ms", "successful_requests_per_second")]
        if any(type(v) not in (float, int) or not 0 <= v <= 1e12 for v in values):
            return False
        if not all(math.isfinite(v) for v in values):
            return False
        if not values[0] <= values[1] <= values[2] or values[3] <= 0:
            return False
    return True

def acceptance_report(load_report):
    valid = assess_load_report(load_report)
    return {
        "schema": "xsus-production-acceptance-v1",
        "status": "local_load_evidence_valid" if valid else "blocked",
        "load_evidence_valid": valid,
        "production_ready": False,
        "deployment_authorized": False,
        "pending_external_gates": list(EXTERNAL_GATES),
        "limitations": ["report_shape_is_not_provenance", "loopback_is_not_production"],
    }

if __name__ == "__main__":
    import json
    import sys
    from pathlib import Path
    report = acceptance_report(json.loads(Path(sys.argv[1]).read_text()))
    print(json.dumps(report, indent=2))
    sys.exit(0 if report["load_evidence_valid"] else 1)
