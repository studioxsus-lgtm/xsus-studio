"""Recognize explicit proofreading requests in written-English conversations."""

import re

from .document import proofread_markdown
from .feedback import explain_edits, explain_review
from .paragraph import ParagraphStatus, proofread_paragraph
from .proofreader import ProofreadingStatus, proofread_sentence

_COMMAND = re.compile(
    r"\A[ \t]*(?P<command>proofread markdown|proofread paragraph|explain paragraph corrections|"
    r"proofread|correct the grammar|explain corrections)[ \t]*:[ \t]*(?P<sentence>.*)\Z",
    re.IGNORECASE | re.DOTALL,
)


def answer_proofreading_request(text: str) -> str | None:
    """Return feedback for a supported command, or hand off to text generation."""
    command = _COMMAND.fullmatch(text)
    if command is None:
        return None
    sentence = command["sentence"]
    operation = command["command"].casefold()
    if operation == "proofread markdown":
        # A newline immediately after the command separates it from the document.
        if sentence.startswith("\r\n"):
            sentence = sentence[2:]
        elif sentence.startswith("\n"):
            sentence = sentence[1:]
        if not sentence.strip():
            return "Please provide an English Markdown document to proofread."
        document = proofread_markdown(sentence)
        if document.status is ParagraphStatus.PARTIAL:
            return f"Some prose still needs manual review.\n{document.text}"
        if document.status is ParagraphStatus.REVIEW_REQUIRED:
            return f"This document needs manual review.\n{document.text}"
        return document.text
    if operation in {"proofread paragraph", "explain paragraph corrections"}:
        if not sentence.strip():
            return "Please provide an English paragraph to proofread."
        paragraph = proofread_paragraph(sentence)
        feedback = ""
        if operation == "explain paragraph corrections":
            feedback = explain_edits(paragraph.edits)
            feedback += explain_review([passage.review_reason for passage in paragraph.passages])
        if paragraph.status is ParagraphStatus.CORRECTED:
            return paragraph.text + feedback
        if paragraph.status is ParagraphStatus.PARTIAL:
            return f"Some sentences still need manual review.\n{paragraph.text}" + feedback
        if paragraph.status is ParagraphStatus.UNCHANGED:
            return f"No grammar correction found in these sentences.\n{paragraph.text}"
        return f"This paragraph needs manual review.\n{paragraph.text}" + feedback
    if not sentence.strip():
        return "Please provide one English sentence to proofread."
    result = proofread_sentence(sentence)
    if result.status is ProofreadingStatus.CORRECTED:
        return result.text + (explain_edits(result.edits) if operation == "explain corrections" else "")
    if result.status is ProofreadingStatus.UNCHANGED:
        return f"No grammar correction found in this sentence.\n{result.text}"
    review = explain_review([result.review_reason]) if operation == "explain corrections" else ""
    return f"This sentence needs manual review.\n{result.text}" + review
