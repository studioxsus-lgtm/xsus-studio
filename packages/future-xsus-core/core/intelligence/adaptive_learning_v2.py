"""Evaluate supplied rule corrections against bounded formal regression suites."""
from dataclasses import dataclass
from .reasoning_v1 import Rule, _atom
from .reasoning_v2 import MultiStepReasoner

@dataclass(frozen=True, slots=True)
class LearningCase:
    facts: tuple
    query: str
    expected: bool

def evaluate_candidate(baseline, candidate, development, holdout):
    for rules in (baseline,candidate):
        MultiStepReasoner((),rules)
    seen=set()
    for suite in (development,holdout):
        if type(suite) is not tuple or not 1<=len(suite)<=256:
            raise ValueError("Invalid suite")
        for case in suite:
            if not isinstance(case,LearningCase) or type(case.expected) is not bool:
                raise ValueError("Invalid case")
            MultiStepReasoner(case.facts,())
            _atom(case.query)
            key=(frozenset(case.facts),case.query)
            if key in seen:
                raise ValueError("Duplicate semantic case")
            seen.add(key)
    fixed=regressions=holdout_failures=0
    for index,suite in enumerate((development,holdout)):
        for case in suite:
            old=MultiStepReasoner(case.facts,baseline).prove(case.query).entailed==case.expected
            new=MultiStepReasoner(case.facts,candidate).prove(case.query).entailed==case.expected
            regressions+=int(old and not new)
            if index==0:
                fixed+=int(not old and new)
            else:
                holdout_failures+=int(not new)
    status=("blocked" if regressions or holdout_failures else
            "eligible_for_manual_review" if fixed else "insufficient_improvement")
    return {"status":status,"fixed_development":fixed,"regressions":regressions,
            "holdout_failures":holdout_failures,"promotion_authorized":False,
            "limitations":("formal_cases_only","caller_supplied_labels","no_automatic_learning")}
