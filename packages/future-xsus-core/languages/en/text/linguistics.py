"""Inspect English word forms and supported clause structures locally."""

import argparse
import json
from dataclasses import asdict, dataclass

from .grammar import GrammarIssue, check_grammar
from .morphology import inflect_verb, pluralize_noun
from .syntax import Clause, analyze_clause


@dataclass(frozen=True, slots=True)
class ClauseAnalysis:
    clause: Clause
    issues: tuple[GrammarIssue, ...]


def analyze_english(sentence: str) -> ClauseAnalysis | None:
    clause = analyze_clause(sentence)
    if clause is None:
        return None
    return ClauseAnalysis(clause, check_grammar(clause))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="operation", required=True)
    commands.add_parser("clause").add_argument("sentence")
    commands.add_parser("verb").add_argument("lemma")
    commands.add_parser("plural").add_argument("lemma")
    args = parser.parse_args()
    if args.operation == "clause":
        analysis = analyze_english(args.sentence)
        if analysis is None:
            print(json.dumps({"status": "unsupported_clause"}))
            return 1
        result = asdict(analysis)
        result["clause"]["forms"] = sorted(analysis.clause.forms)
        if analysis.clause.auxiliary is not None:
            result["clause"]["auxiliary"]["forms"] = sorted(analysis.clause.auxiliary.forms)
    else:
        try:
            result = (
                asdict(inflect_verb(args.lemma)) if args.operation == "verb"
                else {"plural": pluralize_noun(args.lemma)}
            )
        except ValueError as error:
            parser.error(str(error))
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
