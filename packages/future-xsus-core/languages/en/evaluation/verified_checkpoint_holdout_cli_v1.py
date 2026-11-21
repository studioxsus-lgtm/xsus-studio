"""Read-only English checkpoint generation benchmark with checked corpus splits.

Example:
 python -m languages.en.evaluation.verified_checkpoint_holdout_cli_v1 \
   --checkpoint languages/en/models/checkpoints/xsus-en-written-v5.json.gz \
   --evaluation languages/en/evaluation/quality-v5.jsonl \
   --training languages/en/data/training-v2.jsonl \
   --training languages/en/data/training-v3.jsonl \
   --training languages/en/data/training-v4.jsonl \
   --training languages/en/data/training-v5.jsonl

Run from packages/future-xsus-core. Prints aggregate JSON only; no files written.
The supplied training corpora are checked, but checkpoint provenance is not authenticated.
"""
import argparse
import json
from pathlib import Path

from languages.en.evaluation.verified_checkpoint_holdout_v1 import (
    inspect_verified_checkpoint_holdout_v1,
)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checkpoint", required=True, type=Path)
    parser.add_argument("--evaluation", required=True, type=Path)
    parser.add_argument("--training", required=True, action="append", type=Path)
    parser.add_argument("--max-new-tokens", type=int, default=32)
    args = parser.parse_args(argv)
    report = inspect_verified_checkpoint_holdout_v1(
        args.checkpoint, args.training, args.evaluation,
        max_new_tokens=args.max_new_tokens,
    )
    print(json.dumps(report, sort_keys=True, allow_nan=False))
    return report


if __name__ == "__main__":
    main()
