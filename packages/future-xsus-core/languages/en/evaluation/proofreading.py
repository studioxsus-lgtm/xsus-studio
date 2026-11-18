"""Evaluate deterministic proofreading against independently authored cases."""

import argparse
import json
from collections import Counter
from pathlib import Path

from ..text.editing.document import proofread_markdown
from ..text.editing.paragraph import ParagraphStatus, proofread_paragraph
from ..text.editing.proofreader import ProofreadingStatus, proofread_sentence

_SENTENCE_CASES = Path(__file__).with_name("proofreading-v1.jsonl")
_PARAGRAPH_CASES = Path(__file__).with_name("proofreading-paragraphs-v1.jsonl")
_DOCUMENT_CASES = Path(__file__).with_name("proofreading-documents-v1.jsonl")


def evaluate(path: Path, *, paragraphs: bool = False, documents: bool = False) -> dict:
    if paragraphs and documents:
        raise ValueError("Choose either paragraph or document mode")
    status_type = ParagraphStatus if paragraphs or documents else ProofreadingStatus
    if documents:
        proofread = proofread_markdown
    elif paragraphs:
        proofread = proofread_paragraph
    else:
        proofread = proofread_sentence
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
                status = status_type(status)
                if (status in {"corrected", "partial"}) == (sentence == expected):
                    raise ValueError("Expected output contradicts the status")
            except (KeyError, TypeError, ValueError) as error:
                raise ValueError(f"Invalid proofreading case at {path}:{number}") from error
            identifiers.add(identifier)
            totals[status] += 1
            actual = proofread(sentence)
            if actual.status != status or actual.text != expected:
                failures.append({"id": identifier, "actual_status": actual.status, "actual_output": actual.text})
    if not identifiers:
        raise ValueError("Proofreading evaluation contains no cases")
    return {"cases": len(identifiers), "accepted": len(identifiers) - len(failures), "by_status": dict(totals), "failures": failures}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cases", type=Path)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument("--paragraphs", action="store_true")
    modes.add_argument("--documents", action="store_true")
    args = parser.parse_args()
    default_cases = _DOCUMENT_CASES if args.documents else _PARAGRAPH_CASES if args.paragraphs else _SENTENCE_CASES
    report = evaluate(args.cases or default_cases, paragraphs=args.paragraphs, documents=args.documents)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return int(bool(report["failures"]))


if __name__ == "__main__":
    raise SystemExit(main())
