"""1000 unique controlled WH/progressive/perfect grammar diagnostics."""
import json
from languages.en.text.understanding.expanded_english_v1 import SUBJECTS, VERBS, NOUNS, _SINGULAR
from languages.en.text.understanding.advanced_grammar_v1 import (
    _ING, _PARTICIPLES, analyze_advanced_grammar,
)

def evaluate_advanced_grammar() -> dict:
    gerunds = {lemma: form for form, lemma in _ING.items() if lemma in VERBS}
    participles = {lemma: form for form, lemma in _PARTICIPLES.items() if lemma in VERBS}
    cases = []
    for i in range(1000):
        subject = SUBJECTS[(i // 40) % len(SUBJECTS)]
        verb = VERBS[i % len(VERBS)]
        noun = NOUNS[(i // 600 + i // 40) % len(NOUNS)]
        if i % 3 == 0:
            aux = "is" if subject in _SINGULAR else "am" if subject == "i" else "are"
            sentence, kind = f"{subject} {aux} {gerunds[verb]} the {noun}.", "progressive"
        elif i % 3 == 1:
            aux = "has" if subject in _SINGULAR else "have"
            sentence, kind = f"{subject} {aux} {participles[verb]} the {noun}.", "perfect"
        else:
            aux = "does" if subject in _SINGULAR else "do"
            sentence, kind = f"What {aux} {subject} {verb} the {noun}?", "wh_question_what"
        cases.append((sentence, kind))
    resolved = sum(analyze_advanced_grammar(sentence).kind == kind
                   and analyze_advanced_grammar(sentence).status == "resolved"
                   for sentence, kind in cases)
    unique = len(set(sentence for sentence, _ in cases))
    return {
        "contract": "future-xsus-core.advanced-grammar-benchmark.v1",
        "cases": len(cases), "unique_cases": unique,
        "resolved_correctly": resolved,
        "passed": len(cases) == unique == resolved == 1000,
        "independent_external_holdout_proven": False,
        "complete_english_grammar_proven": False,
        "production_authorized": False,
    }

if __name__ == "__main__":
    result = evaluate_advanced_grammar()
    print(json.dumps(result, indent=2, sort_keys=True))
    if not result["passed"]:
        raise SystemExit(1)
