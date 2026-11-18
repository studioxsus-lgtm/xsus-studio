"""Build the v5 writing corpus, held-out cases, and answer-free topic catalog."""

import argparse
import json
import re
from pathlib import Path

from ..lessons.grammar_v5 import LESSONS as GRAMMAR
from ..lessons.style_v5 import LESSONS as STYLE
from ...text.normalization.written_v5 import _LEAD_INS, _TASKS
from .expand_corpus import build_v3_rows
from .written_corpus import build_written_rows

_ROOT = Path(__file__).resolve().parents[2]
_EVAL_REQUESTS = (
    "What should an editor know about {topic}?",
    "Give me a short writing lesson on {topic}.",
    "{topic}: could you give a quick explanation?",
)


def _jsonl(rows):
    return "".join(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n" for row in rows)


def build_artifacts() -> dict[str, str]:
    training = build_v3_rows(_ROOT / "data/training.jsonl") + build_written_rows()
    evaluation = []
    catalog = []
    for slug, topic, pattern, answer, aliases in GRAMMAR + STYLE:
        if not all(re.fullmatch(pattern, phrase) for phrase in (topic, *aliases)):
            raise ValueError(f"Topic pattern does not match a declared phrase: {slug}")
        catalog.append((slug, pattern))
        training.extend(
            {"prompt": f"{lead} {task} {topic}{'.' if lead == 'Please' or lead.startswith('I') else '?'}",
             "response": answer}
            for lead in _LEAD_INS
            for task in _TASKS
        )
        evaluation.extend(
            {"id": f"{slug}-{index}", "prompt": frame.format(topic=alias), "response": answer,
             "facts": [], "patterns": [re.escape(answer.casefold())]}
            for index, (alias, frame) in enumerate(zip(aliases, _EVAL_REQUESTS, strict=True), 1)
        )
    return {
        "data/training-v5.jsonl": _jsonl(training),
        "evaluation/quality-v5.jsonl": _jsonl(evaluation),
        "text/normalization/written_topics_v5.json": json.dumps(catalog, ensure_ascii=False, indent=2) + "\n",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-root", required=True, type=Path)
    output_root = parser.parse_args().output_root
    for relative, content in build_artifacts().items():
        destination = output_root / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(content, encoding="utf-8")


if __name__ == "__main__":
    main()
