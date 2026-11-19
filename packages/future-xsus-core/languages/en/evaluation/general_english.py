"""Evaluate broad English clause coverage against authored structural cases."""

import argparse
import json
from pathlib import Path

from ..text.linguistics import analyze_english

_CASES = Path(__file__).with_name("general-vocabulary-v1.jsonl")


def _actual(sentence: str) -> dict | None:
    analysis = analyze_english(sentence)
    if analysis is None:
        return None
    clause = analysis.clause
    return {
        "subject": clause.subject.head,
        "number": clause.subject.number.value if clause.subject.number is not None else None,
        "verb": clause.lemma,
        "object": clause.object.head if clause.object is not None else None,
        "complement": clause.complement,
        "kind": clause.kind.value,
        "voice": clause.voice.value,
        "agent": clause.agent.head if clause.agent is not None else None,
        "negated": clause.negated,
        "issues": [issue.code.value for issue in analysis.issues],
    }


def evaluate(path: Path = _CASES) -> dict:
    identifiers: set[str] = set()
    failures = []
    with path.open(encoding="utf-8") as source:
        for line_number, line in enumerate(source, 1):
            try:
                row = json.loads(line)
                identifier, sentence, expected = row["id"], row["input"], row["expected"]
                if not isinstance(identifier, str) or not identifier or identifier in identifiers:
                    raise ValueError("Invalid or duplicate case identifier")
                if not isinstance(sentence, str) or not sentence.strip():
                    raise ValueError("Invalid sentence")
                if expected is not None and not isinstance(expected, dict):
                    raise ValueError("Expected clause must be an object or null")
                identifiers.add(identifier)
            except (KeyError, TypeError, ValueError) as error:
                raise ValueError(f"Invalid general-English case at {path}:{line_number}") from error

            actual = _actual(sentence)
            if expected is None:
                accepted = actual is None
            else:
                accepted = actual is not None and all(actual.get(key) == value for key, value in expected.items())
            if not accepted:
                failures.append({"id": identifier, "expected": expected, "actual": actual})

    if not identifiers:
        raise ValueError("General-English evaluation contains no cases")
    return {"cases": len(identifiers), "accepted": len(identifiers) - len(failures), "failures": failures}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cases", type=Path, default=_CASES)
    args = parser.parse_args()
    report = evaluate(args.cases)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return int(bool(report["failures"]))


if __name__ == "__main__":
    raise SystemExit(main())
