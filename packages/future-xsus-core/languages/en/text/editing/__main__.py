"""Proofread one English clause, or independently check clauses from stdin."""

import argparse
import json
import sys
from dataclasses import asdict

from .proofreader import proofread_sentence


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("sentence", nargs="?")
    source.add_argument("--lines", action="store_true", help="Read one clause per input line and emit JSON Lines")
    args = parser.parse_args()
    if args.lines:
        for line in sys.stdin:
            result = proofread_sentence(line.rstrip("\r\n"))
            print(json.dumps(asdict(result), ensure_ascii=False))
    else:
        result = proofread_sentence(args.sentence)
        print(json.dumps(asdict(result), indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
