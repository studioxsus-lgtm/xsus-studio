"""Aggregate-only, development-authored sentence relation benchmark."""
import json
from pathlib import Path

from languages.en.text.understanding.sentence_relations_v1 import compare_sentence_frames

DEFAULT = Path(__file__).with_name("sentence_relations_holdout_v1.jsonl")
_RELATIONS = frozenset({"same_explicit_frame", "opposite_explicit_polarity",
                        "different_explicit_subject", "different_explicit_action",
                        "different_explicit_object", "different_explicit_frames"})


def evaluate_sentence_relations(path: Path = DEFAULT) -> dict:
    seen = set()
    counts = dict(cases=0, labeled_cases=0, expected_abstentions=0,
                  correct=0, wrong=0, missed=0, true_abstentions=0, false_resolutions=0)
    for number, line in enumerate(Path(path).read_text(encoding="utf-8").splitlines(), 1):
        try:
            row = json.loads(line)
            if not isinstance(row, dict) or set(row) != {"id", "first", "second", "expected_relation"}:
                raise ValueError("invalid schema")
            if type(row["id"]) is not str or not row["id"].strip() or row["id"] in seen:
                raise ValueError("duplicate or invalid id")
            expected = row["expected_relation"]
            if expected is not None and expected not in _RELATIONS:
                raise ValueError("invalid relation")
            result = compare_sentence_frames(row["first"], row["second"])
            seen.add(row["id"])
            counts["cases"] += 1
            if expected is None:
                counts["expected_abstentions"] += 1
                counts["true_abstentions" if result.status == "abstained" else "false_resolutions"] += 1
            else:
                counts["labeled_cases"] += 1
                if result.status == "abstained":
                    counts["missed"] += 1
                elif result.relation == expected:
                    counts["correct"] += 1
                else:
                    counts["wrong"] += 1
        except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
            raise ValueError(f"invalid sentence relation benchmark row {number}") from exc
    if not counts["cases"]:
        raise ValueError("empty sentence relation benchmark")
    return {"contract": "future-xsus-core.sentence-relations-benchmark.v1",
            **counts, "raw_text_exposed": False, "production_authorized": False,
            "independent_external_holdout_proven": False,
            "logical_contradiction_proven": False}


if __name__ == "__main__":
    print(json.dumps(evaluate_sentence_relations(), indent=2, sort_keys=True))
