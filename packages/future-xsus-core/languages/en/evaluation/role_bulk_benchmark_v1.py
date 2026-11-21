"""Phase 3.5 deterministic thousand-sentence aggregate stress diagnostic."""
import json

from languages.en.text.understanding.role_bulk_v1 import analyze_role_bulk


def evaluate_role_bulk() -> dict:
    sentences = [
        "She reads the report." if i % 4 == 0
        else "She does not read the report." if i % 4 == 1
        else "The system updates the project." if i % 4 == 2
        else "She reads private records."
        for i in range(1000)
    ]
    result = analyze_role_bulk(sentences)
    checks = {
        "exactly_1000": result.total == 1000,
        "750_resolved": result.resolved == 750,
        "250_abstained": result.abstained == 250,
        "all_results": len(result.results) == 1000,
        "indices_in_order": all(item["index"] == i for i, item in enumerate(result.results)),
        "chunking": result.chunks >= 32,
        "positive": result.results[0]["polarity"] == "positive",
        "negative": result.results[1]["polarity"] == "negative",
        "unsupported_abstains": result.results[3]["status"] == "abstained",
        "no_unsupported_echo": "private records" not in repr(result),
    }
    return {
        "contract": "future-xsus-core.role-bulk-benchmark.v1",
        "passed": all(checks.values()),
        "checks": checks,
        "cases": result.total,
        "chunks": result.chunks,
        "raw_text_exposed": False,
        "independent_external_holdout_proven": False,
        "production_authorized": False,
    }


if __name__ == "__main__":
    report = evaluate_role_bulk()
    print(json.dumps(report, indent=2, sort_keys=True))
    if not report["passed"]:
        raise SystemExit(1)
