"""Compare English checkpoints on the same held-out generation tasks."""

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path

from ..data.preparation.corpus import Example, load_corpus, parse_example, validate_splits
from ..models.checkpoint import load_checkpoint
from ..text.generation.generate import generate

_ROOT = Path(__file__).resolve().parents[1]


def _normalize(text: str) -> str:
    return " ".join(text.casefold().split())


@dataclass(frozen=True, slots=True)
class QualityCase:
    identifier: str
    example: Example
    facts: tuple[tuple[str, ...], ...]
    patterns: tuple[re.Pattern[str], ...]

    def score(self, response: str) -> dict:
        normalized = _normalize(response)
        missing = [
            group[0] for group in self.facts
            if not any(re.search(rf"(?<!\w){re.escape(_normalize(value))}(?!\w)", normalized) for value in group)
        ]
        return {
            "id": self.identifier,
            "reference": self.example.response,
            "generated": response,
            "missing_facts": missing,
            "accepted": not missing and any(pattern.fullmatch(normalized) for pattern in self.patterns),
            "exact_match": response == self.example.response,
        }


def load_cases(path: Path) -> tuple[QualityCase, ...]:
    cases: list[QualityCase] = []
    identifiers: set[str] = set()
    with path.open(encoding="utf-8") as source:
        for line_number, line in enumerate(source, 1):
            try:
                row = json.loads(line)
                identifier = row["id"]
                if not isinstance(identifier, str) or not identifier.strip() or identifier in identifiers:
                    raise ValueError("Expected a unique case ID")
                if not isinstance(row["facts"], list) or not isinstance(row["patterns"], list) or not row["patterns"]:
                    raise ValueError("Expected lists of facts and accepted patterns")
                facts: list[tuple[str, ...]] = []
                for fact in row["facts"]:
                    group = [fact] if isinstance(fact, str) else fact
                    if not isinstance(group, list) or not group or not all(isinstance(value, str) and value.strip() for value in group):
                        raise ValueError("Expected a fact or a list of equivalent forms")
                    facts.append(tuple(group))
                case = QualityCase(
                    identifier, parse_example(row), tuple(facts),
                    tuple(re.compile(pattern) for pattern in row["patterns"]),
                )
                if not case.score(case.example.response)["accepted"]:
                    raise ValueError("The reference does not satisfy its scoring rules")
                cases.append(case)
                identifiers.add(identifier)
            except (KeyError, TypeError, ValueError, re.error) as error:
                raise ValueError(f"Invalid benchmark case at {path}:{line_number}") from error
    if not cases:
        raise ValueError(f"Benchmark is empty: {path}")
    return tuple(cases)


def compare_checkpoint(path: Path, cases: tuple[QualityCase, ...]) -> dict:
    tokenizer, model, revision = load_checkpoint(path)
    details = [
        case.score(generate(tokenizer, model, case.example.conversation))
        for case in cases
    ]
    return {
        "revision": revision,
        "cases": len(cases),
        "accepted": sum(result["accepted"] for result in details),
        "exact_matches": sum(result["exact_match"] for result in details),
        "fact_cases": sum(bool(case.facts) for case in cases),
        "preserved_all_facts": sum(bool(case.facts) and not result["missing_facts"] for case, result in zip(cases, details, strict=True)),
        "details": details,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--baseline", type=Path, required=True)
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--evaluation", type=Path, default=_ROOT / "evaluation" / "quality-v2.jsonl")
    parser.add_argument("--training", type=Path, default=_ROOT / "data" / "training-v2.jsonl")
    args = parser.parse_args()
    cases = load_cases(args.evaluation)
    validate_splits(load_corpus(args.training), tuple(case.example for case in cases))
    print(json.dumps({
        "baseline": compare_checkpoint(args.baseline, cases),
        "candidate": compare_checkpoint(args.candidate, cases),
    }, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
