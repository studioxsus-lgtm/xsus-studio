"""Adversarial word-sense challenge diagnostics; never a production gate.

This challenge intentionally contains cases outside the lexical model's
capabilities. Do not treat its failure as a CI infrastructure failure.
"""
import json
from pathlib import Path

from languages.en.evaluation.word_sense_benchmark_v1 import evaluate_word_sense

CHALLENGE = Path(__file__).with_name("word_sense_challenge_v1.jsonl")


def evaluate_challenge(path: Path = CHALLENGE) -> dict:
    report = evaluate_word_sense(path)
    return {
        "contract": "future-xsus-core.word-sense-challenge.v1",
        "cases": report["cases"],
        "correct_senses": report["correct_senses"],
        "wrong_senses": report["wrong_senses"],
        "missed_senses": report["missed_senses"],
        "true_abstentions": report["true_abstentions"],
        "false_resolutions": report["false_resolutions"],
        "coverage": report["coverage"],
        "labeled_accuracy": report["labeled_accuracy"],
        "per_target": report["per_target"],
        "adversarial_examples_included": True,
        "independent_external_holdout_proven": False,
        "production_authorized": False,
        "raw_text_exposed": False,
    }


if __name__ == "__main__":
    print(json.dumps(evaluate_challenge(), indent=2, sort_keys=True))
