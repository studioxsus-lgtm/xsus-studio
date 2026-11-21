"""Bounded syntax-to-grammar integration for auxiliary-led clauses."""
from dataclasses import dataclass
from ..text.syntax import analyze_clause
from ..text.grammar import check_grammar


@dataclass(frozen=True, slots=True)
class AuxiliaryGrammarProbeV1:
    case_id: str
    sentence: str
    phenomenon: str
    expected_issue: str | None
    expected_suggestion: str | None


ENGLISH_AUXILIARY_GRAMMAR_PROBES_V1 = (
    AuxiliaryGrammarProbeV1("does-read","Does she read the report?","question",None,None),
    AuxiliaryGrammarProbeV1("does-reads","Does she reads the report?","question","auxiliary_verb_form","read"),
    AuxiliaryGrammarProbeV1("did-write","Did he write the message?","question",None,None),
    AuxiliaryGrammarProbeV1("did-writes","Did he writes the message?","question","auxiliary_verb_form","write"),
    AuxiliaryGrammarProbeV1("does-not-read","She does not read the report.","negation",None,None),
    AuxiliaryGrammarProbeV1("does-not-reads","She does not reads the report.","negation","auxiliary_verb_form","read"),
    AuxiliaryGrammarProbeV1("did-not-write","He did not write the message.","negation",None,None),
    AuxiliaryGrammarProbeV1("did-not-writes","He did not writes the message.","negation","auxiliary_verb_form","write"),
)


def evaluate_auxiliary_grammar_integration_v1(
    probes=ENGLISH_AUXILIARY_GRAMMAR_PROBES_V1, *,
    min_cases_per_phenomenon=4, min_accuracy_per_phenomenon=1.0,
):
    if (type(probes) not in (list,tuple) or not 1<=len(probes)<=10000
            or type(min_cases_per_phenomenon) is not int or min_cases_per_phenomenon<1
            or type(min_accuracy_per_phenomenon) not in (float,int)
            or not 0<=min_accuracy_per_phenomenon<=1):
        raise ValueError("Invalid probes or thresholds")
    seen=set()
    grouped={}
    results=[]
    for probe in probes:
        if (not isinstance(probe,AuxiliaryGrammarProbeV1)
                or type(probe.case_id) is not str or not probe.case_id
                or probe.case_id in seen or len(probe.case_id)>128
                or type(probe.sentence) is not str or not probe.sentence
                or len(probe.sentence)>2000
                or probe.phenomenon not in ("question","negation")
                or (probe.expected_issue is not None and type(probe.expected_issue) is not str)
                or (probe.expected_suggestion is not None and type(probe.expected_suggestion) is not str)):
            raise ValueError("Invalid or duplicate auxiliary probe")
        seen.add(probe.case_id)
        clause=analyze_clause(probe.sentence)
        issues=check_grammar(clause) if clause is not None else ()
        observed=issues[0] if len(issues)==1 else None
        code=str(observed.code) if observed else None
        suggestion=observed.suggested if observed else None
        correct=(clause is not None and len(issues)<=1
                 and code==probe.expected_issue
                 and suggestion==probe.expected_suggestion)
        group=grouped.setdefault(probe.phenomenon,{"count":0,"correct":0})
        group["count"]+=1
        group["correct"]+=int(correct)
        results.append({"case_id":probe.case_id,"parsed":clause is not None,
                        "observed_issue":code,"observed_suggestion":suggestion,
                        "correct":correct})
    domains={}
    for name,group in sorted(grouped.items()):
        accuracy=group["correct"]/group["count"]
        domains[name]={**group,"accuracy":accuracy,
                       "passed":group["count"]>=min_cases_per_phenomenon
                       and accuracy>=min_accuracy_per_phenomenon}
    return {
        "contract":"future-xsus-core.english-auxiliary-grammar-integration.v1",
        "case_count":len(results),"correct_count":sum(r["correct"] for r in results),
        "phenomena":domains,"results":results,
        "passed":all(x["passed"] for x in domains.values()),
        "syntax_and_grammar_called_directly":True,
        "independent_holdout_proven":False,
        "release_authorized":False,
    }
