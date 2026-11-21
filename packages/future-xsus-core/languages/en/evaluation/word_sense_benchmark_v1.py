"""Read-only word-sense benchmark; aggregate metrics only, no input text output.

This authored holdout is separate from the lexical cue table, but independence
from all development decisions is not established. Scores are diagnostic.
"""
import argparse
import json
from pathlib import Path

from languages.en.text.understanding.word_sense_v1 import (
    analyze_word_sense, supported_words,
)

_DEFAULT = Path(__file__).with_name("word_sense_holdout_v1.jsonl")


def evaluate_word_sense(path: Path = _DEFAULT) -> dict:
    if not isinstance(path, Path):
        path = Path(path)
    supported = set(supported_words())
    seen_ids = set()
    cases = []
    with path.open(encoding="utf-8") as source:
        for number, line in enumerate(source, 1):
            try:
                row = json.loads(line)
                if not isinstance(row, dict) or set(row) != {"id", "text", "target", "expected_sense"}:
                    raise ValueError("invalid case schema")
                identifier, target, expected = row["id"], row["target"], row["expected_sense"]
                if not isinstance(identifier, str) or not identifier.strip() or identifier in seen_ids:
                    raise ValueError("duplicate or invalid case id")
                if not isinstance(target, str) or target not in supported:
                    raise ValueError("unsupported target")
                if expected is not None and (not isinstance(expected, str) or not expected):
                    raise ValueError("invalid expected sense")
                result = analyze_word_sense(row["text"], target)
                if expected is not None and expected not in result.candidates:
                    raise ValueError("expected sense is not supported")
                seen_ids.add(identifier)
                cases.append((expected, result))
            except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
                raise ValueError(f"invalid benchmark case on line {number}") from exc
    if not cases:
        raise ValueError("empty benchmark")
    labeled = sum(expected is not None for expected, _ in cases)
    abstain_expected = len(cases) - labeled
    correct = sum(expected is not None and result.sense == expected for expected, result in cases)
    wrong = sum(expected is not None and result.sense is not None and result.sense != expected for expected, result in cases)
    missed = sum(expected is not None and result.sense is None for expected, result in cases)
    abstained = sum(result.sense is None for _, result in cases)
    false_resolutions = sum(expected is None and result.sense is not None for expected, result in cases)
    true_abstentions = sum(expected is None and result.sense is None for expected, result in cases)
    resolved = len(cases) - abstained
    # Never conflate accuracy among resolved cases with accuracy over all cases.
    return {
        "contract": "future-xsus-core.word-sense-benchmark.v1",
        "cases": len(cases),
        "labeled_cases": labeled,
        "expected_abstentions": abstain_expected,
        "correct_senses": correct,
        "wrong_senses": wrong,
        "missed_senses": missed,
        "true_abstentions": true_abstentions,
        "false_resolutions": false_resolutions,
        "resolved_cases": resolved,
        "coverage": round(resolved / len(cases), 6),
        "labeled_accuracy": round(correct / labeled, 6) if labeled else None,
        "resolved_precision": round(correct / resolved, 6) if resolved else None,
        "abstention_accuracy": round(true_abstentions / abstain_expected, 6) if abstain_expected else None,
        "open_domain_understanding_proven": False,
        "independent_external_holdout_proven": False,
        "weights_retrained": False,
        "release_authorized": False,
        "raw_text_exposed": False,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--evaluation", type=Path, default=_DEFAULT)
    args = parser.parse_args()
    print(json.dumps(evaluate_word_sense(args.evaluation), indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
