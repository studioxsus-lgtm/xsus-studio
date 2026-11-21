"""Direct morphology engine evaluation across explicitly labeled phenomena."""
from dataclasses import dataclass
from .morphology_holdout_v1 import MorphologyCaseV1, MorphologyThresholdsV1, evaluate_morphology_holdout_v1


@dataclass(frozen=True, slots=True)
class MorphologyPhenomenonV1:
    case: MorphologyCaseV1
    phenomenon: str


ENGLISH_MORPHOLOGY_DIRECT_SUITE_V1 = (
    MorphologyPhenomenonV1(MorphologyCaseV1("irregular-go","go","past","went"),"irregular_verbs"),
    MorphologyPhenomenonV1(MorphologyCaseV1("irregular-see","see","past_participle","seen"),"irregular_verbs"),
    MorphologyPhenomenonV1(MorphologyCaseV1("irregular-speak","speak","past","spoke"),"irregular_verbs"),
    MorphologyPhenomenonV1(MorphologyCaseV1("irregular-take","take","past_participle","taken"),"irregular_verbs"),
    MorphologyPhenomenonV1(MorphologyCaseV1("regular-play","play","past","played"),"regular_verbs"),
    MorphologyPhenomenonV1(MorphologyCaseV1("regular-work","work","third_person","works"),"regular_verbs"),
    MorphologyPhenomenonV1(MorphologyCaseV1("regular-open","open","present_participle","opening"),"regular_verbs"),
    MorphologyPhenomenonV1(MorphologyCaseV1("regular-talk","talk","past_participle","talked"),"regular_verbs"),
    MorphologyPhenomenonV1(MorphologyCaseV1("spelling-study","study","third_person","studies"),"verb_spelling"),
    MorphologyPhenomenonV1(MorphologyCaseV1("spelling-try","try","past","tried"),"verb_spelling"),
    MorphologyPhenomenonV1(MorphologyCaseV1("spelling-stop","stop","present_participle","stopping"),"verb_spelling"),
    MorphologyPhenomenonV1(MorphologyCaseV1("spelling-make","make","present_participle","making"),"verb_spelling"),
    MorphologyPhenomenonV1(MorphologyCaseV1("noun-child","child","plural","children"),"irregular_nouns"),
    MorphologyPhenomenonV1(MorphologyCaseV1("noun-tooth","tooth","plural","teeth"),"irregular_nouns"),
    MorphologyPhenomenonV1(MorphologyCaseV1("noun-mouse","mouse","plural","mice"),"irregular_nouns"),
    MorphologyPhenomenonV1(MorphologyCaseV1("noun-analysis","analysis","plural","analyses"),"irregular_nouns"),
    MorphologyPhenomenonV1(MorphologyCaseV1("plural-book","book","plural","books"),"regular_nouns"),
    MorphologyPhenomenonV1(MorphologyCaseV1("plural-city","city","plural","cities"),"regular_nouns"),
    MorphologyPhenomenonV1(MorphologyCaseV1("plural-box","box","plural","boxes"),"regular_nouns"),
    MorphologyPhenomenonV1(MorphologyCaseV1("plural-tomato","tomato","plural","tomatoes"),"regular_nouns"),
)


def evaluate_morphology_direct_suite_v1(
    cases=ENGLISH_MORPHOLOGY_DIRECT_SUITE_V1, *,
    min_cases_per_phenomenon=4, min_accuracy_per_phenomenon=1.0,
    baseline_predictions=None,
):
    if (type(cases) not in (tuple,list) or not cases or len(cases)>10000
            or type(min_cases_per_phenomenon) is not int or min_cases_per_phenomenon<1
            or type(min_accuracy_per_phenomenon) not in (int,float)
            or not 0<=min_accuracy_per_phenomenon<=1):
        raise ValueError("Invalid suite or thresholds")
    if any(not isinstance(item,MorphologyPhenomenonV1)
           or type(item.phenomenon) is not str
           or not item.phenomenon or len(item.phenomenon)>64 for item in cases):
        raise ValueError("Invalid phenomenon case")
    report=evaluate_morphology_holdout_v1(
        [item.case for item in cases],
        thresholds=MorphologyThresholdsV1(min_cases=1,min_accuracy=0,max_regressions=0),
        baseline_predictions=baseline_predictions,
    )
    grouped={}
    for item,observed in zip(cases,report["results"]):
        group=grouped.setdefault(item.phenomenon,{"count":0,"correct":0})
        group["count"]+=1
        group["correct"]+=int(observed["correct"])
    results={}
    for name,group in sorted(grouped.items()):
        accuracy=group["correct"]/group["count"]
        results[name]={**group,"accuracy":accuracy,
                       "passed":group["count"]>=min_cases_per_phenomenon
                       and accuracy>=min_accuracy_per_phenomenon}
    return {
        "contract":"future-xsus-core.english-morphology-direct-suite.v1",
        "dataset_sha256":report["dataset_sha256"],
        "case_count":report["case_count"],
        "correct_count":report["correct_count"],
        "accuracy":report["accuracy"],
        "phenomena":results,
        "regressions":report["regressions"],
        "passed":report["passed"] and all(v["passed"] for v in results.values()),
        "engine_called_directly":True,
        "independent_holdout_proven":False,
        "general_language_accuracy_verified":False,
        "release_authorized":False,
    }
