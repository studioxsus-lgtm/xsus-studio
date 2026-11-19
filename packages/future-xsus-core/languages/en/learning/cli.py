"""Review feedback examples and run an evaluation-gated XSUS English learning cycle."""

import argparse
import json
from pathlib import Path

from languages.en.data.preparation.corpus import load_corpus
from languages.en.learning.continual import build_candidate
from languages.en.learning.feedback_store import SQLiteFeedbackStore

_ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--store", required=True, type=Path, help="Local SQLite feedback database")
    parser.add_argument("--owner-id", required=True, help="Owner scope for private feedback records")
    actions = parser.add_subparsers(dest="action", required=True)

    ingest = actions.add_parser("ingest", help="Store examples after explicit consent")
    ingest.add_argument("--input", required=True, type=Path, help="Local JSONL corpus with prompt/response rows")
    ingest.add_argument("--consent", action="store_true", help="Confirm these examples may be stored for learning")

    review = actions.add_parser("review", help="Approve or reject one pending example")
    review.add_argument("--example-id", required=True)
    review.add_argument("--decision", required=True, choices=("accept", "reject"))

    learn = actions.add_parser("learn", help="Create and evaluate a warm-started candidate checkpoint")
    learn.add_argument("--baseline", type=Path, default=_ROOT / "models/checkpoints/xsus-en-written-v5.json.gz")
    learn.add_argument("--training", type=Path, default=_ROOT / "data/training-v5.jsonl")
    learn.add_argument("--written-v4", type=Path, default=_ROOT / "evaluation/quality-v4.jsonl")
    learn.add_argument("--written-v5", type=Path, default=_ROOT / "evaluation/quality-v5.jsonl")
    learn.add_argument("--candidate", required=True, type=Path)
    learn.add_argument("--report", required=True, type=Path)
    learn.add_argument("--seed", type=int, default=23)
    learn.add_argument("--epochs", type=int, default=1)
    learn.add_argument("--learning-rate", type=float, default=0.008)
    learn.add_argument("--replay-examples", type=int, default=96)

    args = parser.parse_args()
    store = SQLiteFeedbackStore(args.store)
    if args.action == "ingest":
        if not args.consent:
            parser.error("ingest requires --consent; feedback stays local and pending until reviewed")
        examples = load_corpus(args.input)
        records = [store.submit(args.owner_id, example, consent=True) for example in examples]
        print(json.dumps({"stored": len(records), "pending": sum(record.status == "pending" for record in records), "example_ids": [record.example_id for record in records]}, indent=2))
        return 0
    if args.action == "review":
        record = store.review(args.owner_id, args.example_id, approved=args.decision == "accept")
        print(json.dumps({"example_id": record.example_id, "status": record.status}, indent=2))
        return 0
    report = build_candidate(
        store, args.owner_id,
        baseline_path=args.baseline,
        training_path=args.training,
        evaluation_paths={"written-v4": args.written_v4, "written-v5": args.written_v5},
        candidate_path=args.candidate,
        report_path=args.report,
        seed=args.seed,
        epochs=args.epochs,
        learning_rate=args.learning_rate,
        replay_examples=args.replay_examples,
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
