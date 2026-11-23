"""Phase 12: transparent, deterministic quality checks for Albanian analyses.

Scores describe *internal analysis coverage*, not linguistic correctness.
"""
from dataclasses import dataclass
from .pipeline import TextAnalysis, analyze_text

@dataclass(frozen=True, slots=True)
class QualityReport:
    token_count: int
    word_count: int
    analyzed_words: int
    lexical_coverage: float
    syntax_supported: bool
    agreement_ok: bool | None
    language_evidence: bool
    warnings: tuple[str, ...]

def evaluate_text(text: str) -> QualityReport:
    """Report coverage and structural warnings without claiming correctness."""
    analysis: TextAnalysis = analyze_text(text)
    words = tuple(t for t in analysis.tokens if t.normalized.isalpha())
    analyzed = sum(bool(t.lexical_pos or t.verbs or t.nominals) for t in words)
    clause = analysis.clause
    warnings = []
    if not words:
        warnings.append("no_words")
    if words and analyzed < len(words):
        warnings.append("partial_lexical_coverage")
    if clause is None and words:
        warnings.append("unsupported_syntax")
    if clause is not None and not all(c.agreement for c in clause.clauses):
        warnings.append("subject_verb_disagreement")
    if analysis.language is None and words:
        warnings.append("language_unconfirmed")
    return QualityReport(
        token_count=len(analysis.tokens),
        word_count=len(words),
        analyzed_words=analyzed,
        lexical_coverage=analyzed / len(words) if words else 0.0,
        syntax_supported=clause is not None,
        agreement_ok=(all(c.agreement for c in clause.clauses)
                      if clause is not None else None),
        language_evidence=analysis.language == "sq",
        warnings=tuple(warnings),
    )
