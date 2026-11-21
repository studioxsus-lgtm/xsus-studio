"""Read-only authored diagnostic benchmark for bounded sentence frames."""
import json
from pathlib import Path

from languages.en.text.understanding.sentence_meaning_v1 import analyze_sentence_meaning

DEFAULT = Path(__file__).with_name("sentence_meaning_holdout_v1.jsonl")
_KEYS = frozenset({"subject", "action", "object", "polarity"})


def evaluate_sentence_frames(path: Path = DEFAULT) -> dict:
    path = Path(path)
    seen = set()
    counts = {"cases": 0, "labeled_cases": 0, "expected_abstentions": 0,
              "correct_frames": 0, "wrong_frames": 0, "missed_frames": 0,
              "true_abstentions": 0, "false_resolutions": 0}
    for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        try:
            row = json.loads(line)
            if not isinstance(row, dict) or set(row) != {"id", "text", "expected"}:
                raise ValueError("invalid schema")
            if type(row["id"]) is not str or not row["id"].strip() or row["id"] in seen:
                raise ValueError("invalid or duplicate id")
            expected = row["expected"]
            if expected is not None and (not isinstance(expected, dict) or set(expected) != _KEYS
                                         or any(type(v) is not str or not v for v in expected.values())
                                         or expected["polarity"] not in {"positive", "negative"}):
                raise ValueError("invalid expected frame")
            result = analyze_sentence_meaning(row["text"])
            seen.add(row["id"])
            counts["cases"] += 1
            if expected is None:
                counts["expected_abstentions"] += 1
                counts["true_abstentions" if result.status == "abstained" else "false_resolutions"] += 1
            else:
                counts["labeled_cases"] += 1
                if result.status == "abstained":
                    counts["missed_frames"] += 1
                elif all(getattr(result, key) == value for key, value in expected.items()):
                    counts["correct_frames"] += 1
                else:
                    counts["wrong_frames"] += 1
        except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
            raise ValueError(f"invalid sentence benchmark row {line_no}") from exc
    if not counts["cases"]:
        raise ValueError("empty sentence benchmark")
    return {
        "contract": "future-xsus-core.sentence-frame-benchmark.v1",
        **counts,
        "labeled_accuracy": round(counts["correct_frames"] / counts["labeled_cases"], 6)
        if counts["labeled_cases"] else None,
        "production_authorized": False,
        "independent_external_holdout_proven": False,
        "raw_text_exposed": False,
    }


if __name__ == "__main__":
    print(json.dumps(evaluate_sentence_frames(), indent=2, sort_keys=True))
