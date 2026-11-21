"""Phase 2 engineering acceptance: bounded, authored, non-production.

All component diagnostics must pass. No external blind evaluation or
open-domain semantic understanding is implied.
"""
import json

from languages.en.evaluation.sentence_meaning_quality_gate_v1 import phase2_quality_report
from languages.en.evaluation.sentence_batch_stress_v1 import evaluate_batch_stress
from languages.en.evaluation.sentence_evidence_benchmark_v1 import evaluate_sentence_evidence


def evaluate_phase2_acceptance() -> dict:
    quality = phase2_quality_report()
    stress = evaluate_batch_stress(100)
    evidence = evaluate_sentence_evidence()
    checks = {
        "sentence_frame_quality": quality["passed"],
        "sentence_batch_repeatability": stress["passed"] and stress["iterations"] == 100,
        "evidence_grouping": evidence["passed"] and evidence["cases"] >= 8,
        "quality_has_relation_coverage": quality["relations"]["cases"] >= 24,
        "quality_has_challenge_coverage": quality["challenge"]["cases"] >= 24,
        "quality_has_baseline_coverage": quality["baseline"]["cases"] >= 32,
        "no_raw_text_reports": (
            not quality["baseline"]["raw_text_exposed"]
            and not quality["challenge"]["raw_text_exposed"]
            and not quality["relations"]["raw_text_exposed"]
            and not stress["raw_text_exposed"]
            and not evidence["raw_text_exposed"]
        ),
        "no_production_authorization": (
            not quality["production_authorized"]
            and not stress["production_authorized"]
            and not evidence["production_authorized"]
        ),
    }
    return {
        "contract": "future-xsus-core.phase2-acceptance.v1",
        "phase": 2,
        "engineering_acceptance_passed": all(checks.values()),
        "checks": checks,
        "diagnostic_cases": (
            quality["baseline"]["cases"]
            + quality["challenge"]["cases"]
            + quality["relations"]["cases"]
            + evidence["cases"]
        ),
        "stress_iterations": stress["iterations"],
        "production_authorized": False,
        "independent_external_holdout_proven": False,
        "open_domain_understanding_proven": False,
        "logical_contradiction_proven": False,
        "document_understanding_proven": False,
    }


if __name__ == "__main__":
    report = evaluate_phase2_acceptance()
    print(json.dumps(report, indent=2, sort_keys=True))
    if not report["engineering_acceptance_passed"]:
        raise SystemExit(1)
