"""Bounded paragraph structure and surface-level transition diagnostics."""
from dataclasses import dataclass
import re
from .structure_v6 import analyze_structure

_BREAK = re.compile(r"\n[ \t]*\n+")
_WORD = re.compile(r"[A-Za-z]+")
_STOP = frozenset({"the", "and", "that", "this", "with", "from", "have", "has",
                   "had", "are", "was", "were", "for", "you", "they", "she",
                   "him", "her", "his", "its", "but", "not", "can", "will"})
_TRANSITIONS = {
    "contrast": re.compile(r"^(?:however|nevertheless|on the other hand)\b", re.I),
    "consequence": re.compile(r"^(?:therefore|consequently|as a result)\b", re.I),
    "sequence": re.compile(r"^(?:first|next|finally|then)\b", re.I),
    "example": re.compile(r"^(?:for example|for instance)\b", re.I),
}


@dataclass(frozen=True, slots=True)
class ParagraphV6:
    index: int
    sentence_count: int
    word_count: int
    opening_transition: str | None
    segmentation_uncertain: bool


@dataclass(frozen=True, slots=True)
class ParagraphLinkV6:
    source: int
    target: int
    shared_terms: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class DocumentStructureV6:
    paragraph_count: int
    paragraphs: tuple[ParagraphV6, ...]
    adjacent_links: tuple[ParagraphLinkV6, ...]
    evaluates_document_quality: bool = False


def analyze_paragraphs_v6(text: str) -> DocumentStructureV6:
    if not isinstance(text, str) or not text.strip() or len(text) > 10000:
        raise ValueError("text must be a nonempty string of at most 10000 characters")
    pieces = [part.strip() for part in _BREAK.split(text.strip()) if part.strip()]
    paragraphs = []
    terms = []
    for index, piece in enumerate(pieces):
        structure = analyze_structure(piece)
        words = [word.lower() for word in _WORD.findall(piece)]
        transition = next((label for label, pattern in _TRANSITIONS.items()
                           if pattern.search(piece)), None)
        paragraphs.append(ParagraphV6(index, len(structure.sentences),
                                      len(words), transition,
                                      structure.segmentation_uncertain))
        terms.append(frozenset(word for word in words
                              if len(word) > 2 and word not in _STOP))
    links = tuple(ParagraphLinkV6(i - 1, i,
                                  tuple(sorted(terms[i - 1].intersection(terms[i]))))
                  for i in range(1, len(pieces)))
    return DocumentStructureV6(len(pieces), tuple(paragraphs), links)
