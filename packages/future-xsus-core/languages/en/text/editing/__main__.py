"""Proofread English clauses or a paragraph, with original-text edit offsets."""

import argparse
import json
import sys
from dataclasses import asdict

from .paragraph import proofread_paragraph
from .proofreader import proofread_sentence


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("sentence", nargs="?")
    source.add_argument("--lines", action="store_true", help="Read one clause per input line and emit JSON Lines")
    source.add_argument("--paragraph", action="store_true", help="Read an entire paragraph from stdin")
    args = parser.parse_args()
    if args.paragraph:
        result = proofread_paragraph(sys.stdin.buffer.read().decode(sys.stdin.encoding or "utf-8"))
        print(json.dumps(asdict(result), indent=2, ensure_ascii=False))
        return
    if args.lines:
        for line in sys.stdin:
            result = proofread_sentence(line.rstrip("\r\n"))
            print(json.dumps(asdict(result), ensure_ascii=False))
    else:
        result = proofread_sentence(args.sentence)
        print(json.dumps(asdict(result), indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
