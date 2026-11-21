"""Direct probes for existing English syntax clause features."""
from dataclasses import dataclass
from ..text.syntax import analyze_clause


@dataclass(frozen=True, slots=True)
class SyntaxFeatureProbeV1:
    case_id: str
    sentence: str
    feature: str
    expected: str


ENGLISH_SYNTAX_FEATURE_PROBES_V1 = (
    SyntaxFeatureProbeV1("question-do","Does she read the report?","kind","question"),
    SyntaxFeatureProbeV1("question-did","Did he write the message?","kind","question"),
    SyntaxFeatureProbeV1("question-can","Can she open the folder?","kind","question"),
    SyntaxFeatureProbeV1("question-will","Will they read the report?","kind","question"),
    SyntaxFeatureProbeV1("negation-do","She does not read the report.","negated","true"),
    SyntaxFeatureProbeV1("negation-did","He did not write the message.","negated","true"),
    SyntaxFeatureProbeV1("negation-can","She cannot open the folder.","negated","true"),
    SyntaxFeatureProbeV1("negation-will","They will not read the report.","negated","true"),
    SyntaxFeatureProbeV1("subject-she","She reads the report.","subject","she"),
    SyntaxFeatureProbeV1("subject-he","He writes the message.","subject","he"),
    SyntaxFeatureProbeV1("subject-they","They open the folder.","subject","they"),
    SyntaxFeatureProbeV1("subject-we","We read the report.","subject","we"),
)


def evaluate_syntax_features_direct_v1(
    probes=ENGLISH_SYNTAX_FEATURE_PROBES_V1, *,
    min_cases_per_feature=4, min_accuracy_per_feature=1.0,
):
    if (type(probes) not in (tuple,list) or not 1<=len(probes)<=10000
            or type(min_cases_per_feature) is not int or min_cases_per_feature<1
            or type(min_accuracy_per_feature) not in (int,float)
            or not 0<=min_accuracy_per_feature<=1):
        raise ValueError("Invalid probes or thresholds")
    seen=set()
    grouped={}
    results=[]
    for probe in probes:
        if (not isinstance(probe,SyntaxFeatureProbeV1)
                or type(probe.case_id) is not str or not probe.case_id
                or probe.case_id in seen or len(probe.case_id)>128
                or type(probe.sentence) is not str or not probe.sentence
                or len(probe.sentence)>2000
                or probe.feature not in ("kind","negated","subject")
                or type(probe.expected) is not str or not probe.expected):
            raise ValueError("Invalid or duplicate feature probe")
        seen.add(probe.case_id)
        clause=analyze_clause(probe.sentence)
        if clause is None:
            observed=None
        elif probe.feature=="kind":
            observed=str(clause.kind)
        elif probe.feature=="negated":
            observed=str(clause.negated).lower()
        else:
            observed=clause.subject.head
        correct=observed==probe.expected
        group=grouped.setdefault(probe.feature,{"count":0,"correct":0})
        group["count"]+=1
        group["correct"]+=int(correct)
        results.append({"case_id":probe.case_id,"feature":probe.feature,
                        "expected":probe.expected,"observed":observed,"correct":correct})
    feature_reports={}
    for name,group in sorted(grouped.items()):
        accuracy=group["correct"]/group["count"]
        feature_reports[name]={**group,"accuracy":accuracy,
                               "passed":group["count"]>=min_cases_per_feature
                               and accuracy>=min_accuracy_per_feature}
    return {
        "contract":"future-xsus-core.english-syntax-features-direct.v1",
        "case_count":len(results),"correct_count":sum(r["correct"] for r in results),
        "features":feature_reports,"results":results,
        "passed":all(x["passed"] for x in feature_reports.values()),
        "parser_called_directly":True,
        "independent_holdout_proven":False,
        "release_authorized":False,
    }
