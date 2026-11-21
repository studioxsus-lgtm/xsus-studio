"""Direct, bounded syntax parser regression probes; no training side effects."""
from dataclasses import dataclass
from ..text.syntax import analyze_clause


@dataclass(frozen=True, slots=True)
class SyntaxProbeV1:
    case_id: str
    sentence: str
    expected_parseable: bool
    phenomenon: str


ENGLISH_SYNTAX_DIRECT_SUITE_V1 = (
    SyntaxProbeV1("declarative-1","The student reads the report.",True,"declarative"),
    SyntaxProbeV1("declarative-2","She writes the message.",True,"declarative"),
    SyntaxProbeV1("declarative-3","The teacher reads the book.",True,"declarative"),
    SyntaxProbeV1("declarative-4","He opens the folder.",True,"declarative"),
    SyntaxProbeV1("imperative-1","Read the report.",True,"imperative"),
    SyntaxProbeV1("imperative-2","Open the folder.",True,"imperative"),
    SyntaxProbeV1("imperative-3","Check the file.",True,"imperative"),
    SyntaxProbeV1("imperative-4","Write the message.",True,"imperative"),
    SyntaxProbeV1("invalid-1","",False,"invalid_input"),
    SyntaxProbeV1("invalid-2","123",False,"invalid_input"),
    SyntaxProbeV1("invalid-3","Hello @world!",False,"invalid_input"),
    SyntaxProbeV1("invalid-4","The student reads #report.",False,"invalid_input"),
)


def evaluate_syntax_direct_suite_v1(
    probes=ENGLISH_SYNTAX_DIRECT_SUITE_V1, *,
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
        if (not isinstance(probe,SyntaxProbeV1)
                or type(probe.case_id) is not str or not probe.case_id
                or probe.case_id in seen or len(probe.case_id)>128
                or type(probe.sentence) is not str or len(probe.sentence)>2000
                or type(probe.expected_parseable) is not bool
                or type(probe.phenomenon) is not str or not probe.phenomenon):
            raise ValueError("Invalid or duplicate syntax probe")
        seen.add(probe.case_id)
        observed=analyze_clause(probe.sentence)
        correct=(observed is not None)==probe.expected_parseable
        group=grouped.setdefault(probe.phenomenon,{"count":0,"correct":0})
        group["count"]+=1
        group["correct"]+=int(correct)
        results.append({"case_id":probe.case_id,"expected_parseable":probe.expected_parseable,
                        "observed_parseable":observed is not None,"correct":correct})
    domains={}
    for name,group in sorted(grouped.items()):
        accuracy=group["correct"]/group["count"]
        domains[name]={**group,"accuracy":accuracy,
                       "passed":group["count"]>=min_cases_per_phenomenon
                       and accuracy>=min_accuracy_per_phenomenon}
    return {
        "contract":"future-xsus-core.english-syntax-direct-suite.v1",
        "case_count":len(results),
        "correct_count":sum(row["correct"] for row in results),
        "phenomena":domains,"results":results,
        "passed":all(row["passed"] for row in domains.values()),
        "parser_called_directly":True,
        "full_grammar_correctness_tested":False,
        "independent_holdout_proven":False,
        "release_authorized":False,
    }
