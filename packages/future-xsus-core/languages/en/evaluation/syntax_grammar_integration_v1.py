"""End-to-end syntax-to-grammar diagnostic probes with conservative handling."""
from dataclasses import dataclass
from ..text.syntax import analyze_clause
from ..text.grammar import check_grammar


@dataclass(frozen=True, slots=True)
class SentenceGrammarProbeV1:
    case_id: str
    sentence: str
    expected_issue: str | None
    expected_suggestion: str | None


ENGLISH_SENTENCE_GRAMMAR_PROBES_V1 = (
    SentenceGrammarProbeV1("she-reads","She reads the report.",None,None),
    SentenceGrammarProbeV1("she-write","She write the report.","subject_verb_agreement","writes"),
    SentenceGrammarProbeV1("they-read","They read the report.",None,None),
    SentenceGrammarProbeV1("they-reads","They reads the report.","subject_verb_agreement","read"),
    SentenceGrammarProbeV1("he-writes","He writes the message.",None,None),
    SentenceGrammarProbeV1("he-write","He write the message.","subject_verb_agreement","writes"),
    SentenceGrammarProbeV1("we-write","We write the message.",None,None),
    SentenceGrammarProbeV1("we-writes","We writes the message.","subject_verb_agreement","write"),
)


def evaluate_syntax_grammar_integration_v1(
    probes=ENGLISH_SENTENCE_GRAMMAR_PROBES_V1, *, min_cases=8, min_accuracy=1.0
):
    if (type(probes) not in (list,tuple) or not 1<=len(probes)<=10000
            or type(min_cases) is not int or min_cases<1
            or type(min_accuracy) not in (float,int) or not 0<=min_accuracy<=1):
        raise ValueError("Invalid probes or thresholds")
    seen=set()
    results=[]
    for probe in probes:
        if (not isinstance(probe,SentenceGrammarProbeV1)
                or type(probe.case_id) is not str or not probe.case_id
                or len(probe.case_id)>128 or probe.case_id in seen
                or type(probe.sentence) is not str or not probe.sentence
                or len(probe.sentence)>2000
                or (probe.expected_issue is not None and type(probe.expected_issue) is not str)
                or (probe.expected_suggestion is not None and type(probe.expected_suggestion) is not str)):
            raise ValueError("Invalid or duplicate sentence probe")
        seen.add(probe.case_id)
        clause=analyze_clause(probe.sentence)
        issues=check_grammar(clause) if clause is not None else ()
        observed=issues[0] if len(issues)==1 else None
        code=str(observed.code) if observed else None
        suggestion=observed.suggested if observed else None
        correct=(clause is not None and len(issues)<=1
                 and code==probe.expected_issue
                 and suggestion==probe.expected_suggestion)
        results.append({"case_id":probe.case_id,"parsed":clause is not None,
                        "observed_issue":code,"observed_suggestion":suggestion,
                        "correct":correct})
    correct_count=sum(r["correct"] for r in results)
    return {
        "contract":"future-xsus-core.english-syntax-grammar-integration.v1",
        "case_count":len(results),"correct_count":correct_count,
        "accuracy":correct_count/len(results),"results":results,
        "passed":len(results)>=min_cases and correct_count/len(results)>=min_accuracy,
        "syntax_and_grammar_called_directly":True,
        "independent_holdout_proven":False,
        "release_authorized":False,
    }
