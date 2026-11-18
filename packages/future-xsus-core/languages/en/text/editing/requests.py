"""Recognize explicit proofreading requests in written-English conversations."""

import re

from .proofreader import ProofreadingStatus, proofread_sentence

_COMMAND = re.compile(r"\A[ \t]*(proofread|correct the grammar)[ \t]*:[ \t]*(?P<sentence>.*)\Z", re.IGNORECASE | re.DOTALL)


def answer_proofreading_request(text: str) -> str | None:
    """Return feedback for a supported command, or hand off to text generation."""
    command = _COMMAND.fullmatch(text)
    if command is None:
        return None
    sentence = command["sentence"]
    if not sentence.strip():
        return "Please provide one English sentence to proofread."
    result = proofread_sentence(sentence)
    if result.status is ProofreadingStatus.CORRECTED:
        return result.text
    if result.status is ProofreadingStatus.UNCHANGED:
        return f"No grammar correction found in this sentence.\n{result.text}"
    return f"This sentence needs manual review.\n{result.text}"
