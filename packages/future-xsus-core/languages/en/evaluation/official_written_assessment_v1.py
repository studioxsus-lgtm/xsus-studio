"""Fail-closed assessment of measured official written benchmark deltas.

Assessment is advisory only; it never authorizes model deployment.
"""
from math import isfinite


def assess_official_written_comparison_v1(comparison: dict):
    if type(comparison) is not dict or comparison.get("contract")!="future-xsus-core.official-written-comparison.v1":
        raise ValueError("Official written comparison contract required")
    benchmarks=comparison.get("benchmarks")
    if type(benchmarks) is not dict or set(benchmarks)!={"written-v4","written-v5"}:
        raise ValueError("Both official benchmark results required")
    reasons=[]
    totals={"cases":0,"baseline_accepted":0,"candidate_accepted":0,
            "baseline_exact_matches":0,"candidate_exact_matches":0,
            "baseline_preserved_all_facts":0,"candidate_preserved_all_facts":0}
    for name,row in sorted(benchmarks.items()):
        if type(row) is not dict:
            raise ValueError("Invalid benchmark result")
        cases=row.get("cases")
        baseline=row.get("baseline")
        candidate=row.get("candidate")
        if type(cases) is not int or cases<=0 or type(baseline) is not dict or type(candidate) is not dict:
            raise ValueError("Invalid benchmark counts")
        for label,metrics in (("baseline",baseline),("candidate",candidate)):
            for metric in ("accepted","exact_matches","preserved_all_facts"):
                value=metrics.get(metric)
                if type(value) is not int or not 0<=value<=cases:
                    raise ValueError("Invalid benchmark metric")
                totals[label+"_"+metric]+=value
        for metric in ("accepted","exact_matches","preserved_all_facts"):
            delta=row.get("delta_"+metric)
            if type(delta) is not int or delta!=candidate[metric]-baseline[metric]:
                raise ValueError("Inconsistent benchmark delta")
        digest=row.get("benchmark_sha256")
        if type(digest) is not str or len(digest)!=64 or any(c not in "0123456789abcdef" for c in digest):
            raise ValueError("Invalid benchmark fingerprint")
        totals["cases"]+=cases
        for metric in ("accepted","preserved_all_facts"):
            if candidate[metric]<baseline[metric]:
                reasons.append(f"regression:{name}:{metric}")
    observed=bool(reasons)
    if comparison.get("benchmark_regression_detected") is not observed:
        raise ValueError("Inconsistent regression flag")
    if comparison.get("candidate_automatically_approved") is not False or comparison.get("production_deployed") is not False:
        raise ValueError("Comparison must not authorize release or deployment")
    if totals["candidate_accepted"]==totals["baseline_accepted"]:
        reasons.append("no_net_acceptance_gain")
    return {
        "contract":"future-xsus-core.official-written-assessment.v1",
        "benchmarks":tuple(sorted(benchmarks)),
        "totals":totals,
        "acceptance_delta":totals["candidate_accepted"]-totals["baseline_accepted"],
        "reasons":tuple(reasons),
        "passes_benchmark_non_regression":not observed,
        "has_measured_acceptance_gain":totals["candidate_accepted"]>totals["baseline_accepted"],
        "requires_independent_quality_review":True,
        "candidate_automatically_approved":False,
        "release_authorized":False,
        "production_deployed":False,
    }
