"""Deterministic held-out English morphology benchmark; no training side effects."""
from dataclasses import dataclass
from hashlib import sha256
import json

from ..text.morphology import inflect_verb, pluralize_noun

_VERB_FORMS = ("third_person", "past", "past_participle", "present_participle")


@dataclass(frozen=True, slots=True)
class MorphologyCaseV1:
    case_id: str
    lemma: str
    form: str
    expected: str


@dataclass(frozen=True, slots=True)
class MorphologyThresholdsV1:
    min_cases: int = 10
    min_accuracy: float = 0.9
    max_regressions: int = 0


def evaluate_morphology_holdout_v1(
    cases, *, thresholds=MorphologyThresholdsV1(), baseline_predictions=None
):
    """Evaluate pre-labeled examples without changing the engine or training."""
    if not isinstance(thresholds, MorphologyThresholdsV1):
        raise ValueError("MorphologyThresholdsV1 required")
    if (type(thresholds.min_cases) is not int or thresholds.min_cases < 1
            or type(thresholds.min_accuracy) not in (float, int)
            or not 0 <= thresholds.min_accuracy <= 1
            or type(thresholds.max_regressions) is not int
            or thresholds.max_regressions < 0):
        raise ValueError("Invalid quality thresholds")
    if type(cases) not in (tuple, list) or not cases or len(cases) > 10000:
        raise ValueError("Nonempty bounded sequence required")
    if baseline_predictions is not None and type(baseline_predictions) is not dict:
        raise ValueError("Baseline must be a mapping of case IDs to predictions")
    ids = set()
    results = []
    regressions = []
    for case in cases:
        if not isinstance(case, MorphologyCaseV1):
            raise ValueError("MorphologyCaseV1 required")
        if (type(case.case_id) is not str or not case.case_id
                or len(case.case_id) > 128 or case.case_id in ids):
            raise ValueError("Unique nonempty case IDs required")
        ids.add(case.case_id)
        if (type(case.lemma) is not str or type(case.expected) is not str
                or not case.expected or case.expected != case.expected.lower()):
            raise ValueError("Valid lowercase expected word required")
        if case.form == "plural":
            actual = pluralize_noun(case.lemma)
        elif case.form in _VERB_FORMS:
            actual = getattr(inflect_verb(case.lemma), case.form)
        else:
            raise ValueError("Unsupported morphological form")
        correct = actual == case.expected
        if baseline_predictions is not None:
            if case.case_id not in baseline_predictions:
                raise ValueError("Missing baseline prediction")
            baseline = baseline_predictions[case.case_id]
            if type(baseline) is not str:
                raise ValueError("Baseline prediction must be string")
            if baseline == case.expected and not correct:
                regressions.append(case.case_id)
        results.append({
            "case_id": case.case_id, "form": case.form, "correct": correct,
            "expected": case.expected, "observed": actual,
        })
    passed_count = sum(item["correct"] for item in results)
    accuracy = passed_count / len(results)
    checks = {
        "minimum_cases": len(results) >= thresholds.min_cases,
        "minimum_accuracy": accuracy >= thresholds.min_accuracy,
        "maximum_regressions": len(regressions) <= thresholds.max_regressions,
    }
    digest = sha256(json.dumps([
        (case.case_id, case.lemma, case.form, case.expected) for case in cases
    ], separators=(",", ":"), ensure_ascii=False).encode("utf-8")).hexdigest()
    return {
        "contract": "future-xsus-core.english-morphology-holdout.v1",
        "case_count": len(results), "correct_count": passed_count,
        "accuracy": accuracy, "regressions": regressions,
        "checks": checks, "passed": all(checks.values()),
        "dataset_sha256": digest, "results": results,
        "training_performed": False, "deployment_approved": False,
        "general_language_accuracy_verified": False,
    }


ENGLISH_MORPHOLOGY_HOLDOUT_V1 = (
    MorphologyCaseV1("verb-go-past", "go", "past", "went"),
    MorphologyCaseV1("verb-go-participle", "go", "past_participle", "gone"),
    MorphologyCaseV1("verb-write-past", "write", "past", "wrote"),
    MorphologyCaseV1("verb-write-participle", "write", "past_participle", "written"),
    MorphologyCaseV1("verb-eat-past", "eat", "past", "ate"),
    MorphologyCaseV1("verb-eat-participle", "eat", "past_participle", "eaten"),
    MorphologyCaseV1("verb-plan-progressive", "plan", "present_participle", "planning"),
    MorphologyCaseV1("verb-study-third", "study", "third_person", "studies"),
    MorphologyCaseV1("verb-try-past", "try", "past", "tried"),
    MorphologyCaseV1("verb-make-progressive", "make", "present_participle", "making"),
    MorphologyCaseV1("verb-watch-third", "watch", "third_person", "watches"),
    MorphologyCaseV1("verb-stop-past", "stop", "past", "stopped"),
    MorphologyCaseV1("noun-child", "child", "plural", "children"),
    MorphologyCaseV1("noun-mouse", "mouse", "plural", "mice"),
    MorphologyCaseV1("noun-person", "person", "plural", "people"),
    MorphologyCaseV1("noun-city", "city", "plural", "cities"),
    MorphologyCaseV1("noun-box", "box", "plural", "boxes"),
    MorphologyCaseV1("noun-analysis", "analysis", "plural", "analyses"),
    MorphologyCaseV1("noun-leaf", "leaf", "plural", "leaves"),
    MorphologyCaseV1("noun-book", "book", "plural", "books"),
)
