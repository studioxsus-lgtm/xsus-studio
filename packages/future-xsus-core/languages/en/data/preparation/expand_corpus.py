"""Build the reproducible XSUS English training set from original examples."""

import argparse
import json
from pathlib import Path
from tempfile import TemporaryDirectory

from .corpus import load_corpus, validate_splits

_ROOT = Path(__file__).resolve().parents[2]

# Each delivery has a subject, document and deadline. All phrases are authored for XSUS.
_DELIVERIES = (
    ("Maya", "the draft", "Monday at 9 a.m."),
    ("Noah", "the report", "Tuesday at noon"),
    ("Ava", "the slides", "Wednesday at 2 p.m."),
    ("Leo", "the budget", "Thursday at 3 p.m."),
    ("Emma", "the agenda", "Friday at 10 a.m."),
    ("Liam", "the summary", "Monday at noon"),
    ("Nora", "the invoice", "Tuesday at 2 p.m."),
    ("Sofia", "the revised draft", "Wednesday at 3 p.m."),
    ("Oliver", "the notes", "Thursday at 9 a.m."),
    ("Amelia", "the schedule", "Friday at noon"),
    ("Lucas", "the checklist", "Monday at 2 p.m."),
    ("Elena", "the proposal", "Tuesday at 3 p.m."),
    ("Mia", "the figures", "Wednesday at 10 a.m."),
    ("Henry", "the list", "Thursday at noon"),
    ("Isla", "the files", "Friday at 9 a.m."),
    ("Theo", "the link", "Monday at 10 a.m."),
    ("Zoe", "the plan", "Tuesday at 9 a.m."),
    ("Ethan", "the form", "Wednesday at noon"),
)


def build_rows(seed_path: Path) -> list[dict]:
    rows = []
    for example in load_corpus(seed_path):
        conversation = example.conversation
        row = {"prompt": conversation.text, "response": example.response}
        if conversation.history:
            row["history"] = [{"role": turn.role.value, "text": turn.text} for turn in conversation.history]
        rows.append(row)

    for name, document, deadline in _DELIVERIES:
        message = f"{name}, send {document} by {deadline}."
        polite = f"{name}, could you please send {document} by {deadline}?"
        warm = f"{name}, we would appreciate receiving {document} by {deadline}."
        short = f"{name}, please send {document} by {deadline}."
        rows.extend((
            {"prompt": f"Make this polite: {message}", "response": polite},
            {"prompt": f"Could you make this request more courteous? {message}", "response": polite},
            {"prompt": f"Make this warmer: We need {document} from {name} by {deadline}.", "response": warm},
            {"prompt": f"Make this shorter: I am writing to ask {name} to send {document} by {deadline}.", "response": short},
            {
                "prompt": "Make it shorter.",
                "history": [
                    {"role": "user", "text": f"Make this polite: {message}"},
                    {"role": "assistant", "text": polite},
                ],
                "response": short,
            },
        ))

    for count, item in ((2, "copies"), (3, "labels"), (4, "forms"), (5, "tickets"), (6, "folders"), (8, "badges")):
        rows.extend((
            {"prompt": f"Make this polite: Bring {count} {item}.", "response": f"Could you please bring {count} {item}?"},
            {"prompt": f"Shorten this: I am writing to ask you to bring {count} {item}.", "response": f"Please bring {count} {item}."},
        ))

    for phrase, reply in (
        ("Hi there!", "Hello! How can I help?"),
        ("Hello, can you help?", "Of course. What is your question?"),
        ("Good morning, are you available?", "Good morning! How can I help?"),
        ("Good afternoon, can we start?", "Good afternoon! How can I help?"),
        ("Thanks a lot for your help.", "You are welcome."),
        ("I appreciate your assistance.", "You are welcome."),
        ("Please make this clearer: We need it soon.", "What deadline should the message specify?"),
        ("Clarify this message: We need to meet later.", "What time should the message specify?"),
        ("Make this clearer: Meet me at the usual spot.", "Where should the meeting take place?"),
        ("Make this clearer: Ask them to send it.", "Who should send it, and what should they send?"),
        ("Write a short note of thanks.", "Thank you for your help. I appreciate it."),
        ("Write a brief message thanking a teammate.", "Thank you for your help. I appreciate it."),
    ):
        rows.append({"prompt": phrase, "response": reply})
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    seed = _ROOT / "data" / "training.jsonl"
    evaluation = _ROOT / "evaluation" / "quality-v2.jsonl"
    if args.output.resolve() in {seed.resolve(), evaluation.resolve()}:
        parser.error("choose a separate output file")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    rows = build_rows(seed)
    data = "".join(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n" for row in rows)
    # Check the new split before touching any existing output file.
    with TemporaryDirectory() as temporary:
        path = Path(temporary) / "training.jsonl"
        path.write_text(data, encoding="utf-8")
        validate_splits(load_corpus(path), load_corpus(evaluation))
    args.output.write_text(data, encoding="utf-8")
    print(f"Wrote {len(rows)} XSUS training examples")


if __name__ == "__main__":
    main()
