"""Phase 3 aggregate-only authored action semantics benchmark."""
import json
from pathlib import Path

from languages.en.text.understanding.action_semantics_v1 import classify_action_semantics

DEFAULT = Path(__file__).with_name("action_semantics_holdout_v1.jsonl")
_CATEGORIES = frozenset({
    "information_access", "verification", "content_creation", "construction",
    "access", "transfer", "modification", "removal",
})


def evaluate_action_semantics(path: Path = DEFAULT) -> dict:
    counts = dict(cases=0, labeled_cases=0, expected_abstentions=0,
                  correct=0, wrong=0, missed=0, true_abstentions=0, false_resolutions=0)
    seen = set()
    for number, line in enumerate(Path(path).read_text(encoding="utf-8").splitlines(), 1):
        try:
            row = json.loads(line)
            if not isinstance(row, dict) or set(row) != {"id", "sentence", "expected_category"}:
                raise ValueError("invalid schema")
            identifier = row["id"]
            expected = row["expected_category"]
            if type(identifier) is not str or not identifier.strip() or identifier in seen:
                raise ValueError("duplicate or invalid identifier")
            if type(row["sentence"]) is not str or not row["sentence"].strip():
                raise ValueError("invalid sentence")
            if expected is not None and expected not in _CATEGORIES:
                raise ValueError("invalid category")
            result = classify_action_semantics(row["sentence"])
            seen.add(identifier)
            counts["cases"] += 1
            if expected is None:
                counts["expected_abstentions"] += 1
                counts["true_abstentions" if result.status == "abstained" else "false_resolutions"] += 1
            else:
                counts["labeled_cases"] += 1
                if result.status == "abstained":
                    counts["missed"] += 1
                elif result.category == expected:
                    counts["correct"] += 1
                else:
                    counts["wrong"] += 1
        except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
            raise ValueError(f"invalid action semantics benchmark row {number}") from exc
    if not counts["cases"]:
        raise ValueError("empty action semantics benchmark")
    return {
        "contract": "future-xsus-core.action-semantics-benchmark.v1",
        **counts,
        "raw_text_exposed": False,
        "production_authorized": False,
        "independent_external_holdout_proven": False,
    }


if __name__ == "__main__":
    print(json.dumps(evaluate_action_semantics(), indent=2, sort_keys=True))
