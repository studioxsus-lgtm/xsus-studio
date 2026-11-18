"""Evaluate deterministic proofreading against independently authored cases."""

import argparse
import json
from collections import Counter
from pathlib import Path

from ..text.editing.proofreader import ProofreadingStatus, proofread_sentence

_DEFAULT_CASES = Path(__file__).with_name("proofreading-v1.jsonl")


def evaluate(path: Path) -> dict:
    totals: Counter[str] = Counter()
    failures = []
    identifiers: set[str] = set()
    with path.open(encoding="utf-8") as source:
        for number, line in enumerate(source, 1):
            try:
                row = json.loads(line)
                identifier, sentence, status, expected = (row[key] for key in ("id", "input", "status", "output"))
                if not all(isinstance(value, str) for value in (identifier, sentence, status, expected)):
                    raise ValueError("Fields must be strings")
                if not identifier or identifier in identifiers:
                    raise ValueError("Invalid or duplicate case identifier")
                status = ProofreadingStatus(status)
                if (status == ProofreadingStatus.CORRECTED) == (sentence == expected):
                    raise ValueError("Expected output contradicts the status")
            except (KeyError, TypeError, ValueError) as error:
                raise ValueError(f"Invalid proofreading case at {path}:{number}") from error
            identifiers.add(identifier)
            totals[status] += 1
            actual = proofread_sentence(sentence)
            if actual.status != status or actual.text != expected:
                failures.append({"id": identifier, "actual_status": actual.status, "actual_output": actual.text})
    if not identifiers:
        raise ValueError("Proofreading evaluation contains no cases")
    return {"cases": len(identifiers), "accepted": len(identifiers) - len(failures), "by_status": dict(totals), "failures": failures}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cases", type=Path, default=_DEFAULT_CASES)
    report = evaluate(parser.parse_args().cases)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return int(bool(report["failures"]))


if __name__ == "__main__":
    raise SystemExit(main())
