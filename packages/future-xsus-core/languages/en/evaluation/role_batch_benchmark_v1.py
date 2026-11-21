"""Phase 3.4 aggregate-only bounded batch and evidence diagnostic."""
import json

from languages.en.text.understanding.role_batch_v1 import (
    analyze_role_batch, compare_role_batch_pairs,
)
from languages.en.text.understanding.role_evidence_v1 import group_role_evidence


def evaluate_role_batch() -> dict:
    sentences = [
        "She reads the report.", "She does not read the report.",
        "He reads the report.", "She reads private records.",
    ]
    batch = analyze_role_batch(sentences)
    relations = compare_role_batch_pairs(sentences, [(0, 1), (0, 2), (0, 3)])
    evidence = group_role_evidence(sentences)
    checks = {
        "total": batch.total == 4,
        "resolved": batch.resolved == 3,
        "abstained": batch.abstained == 1,
        "pair_count": relations["count"] == 3,
        "opposite_polarity": relations["pairs"][0]["relation"] == "same_roles_opposite_polarity",
        "different_subject": relations["pairs"][1]["relation"] == "different_subject",
        "unsupported_pair_abstains": relations["pairs"][2]["status"] == "abstained",
        "separate_subject_groups": len(evidence["groups"]) == 2,
        "abstained_index": evidence["abstained_indices"] == (3,),
        "explicit_polarity_difference": any(
            item["explicit_polarity_difference"] for item in evidence["groups"]
        ),
        "no_production_claim": not evidence["production_authorized"],
    }
    return {
        "contract": "future-xsus-core.role-batch-benchmark.v1",
        "passed": all(checks.values()),
        "checks": checks,
        "checks_count": len(checks),
        "raw_text_exposed": False,
        "production_authorized": False,
        "independent_external_holdout_proven": False,
    }


if __name__ == "__main__":
    result = evaluate_role_batch()
    print(json.dumps(result, indent=2, sort_keys=True))
    if not result["passed"]:
        raise SystemExit(1)
