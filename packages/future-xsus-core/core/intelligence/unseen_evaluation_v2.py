"""Synthetic formal evaluation; novel seeds do not certify real-world generalization."""
import random
from .reasoning_v1 import Rule, ReasoningResult, verify_proof
from .problem_solver_v2 import ComplexProblemSolver

def evaluate_generated(seed, *, cases=128):
    if type(seed) is not int or not 0<=seed<2**64:
        raise ValueError("Invalid seed")
    if type(cases) is not int or not 1<=cases<=512:
        raise ValueError("Invalid case count")
    rng=random.Random(seed)
    solver=ComplexProblemSolver()
    passed=0
    failures=[]
    expected_counts={"solved":0,"partial":0,"unknown":0}
    for i in range(cases):
        atoms=tuple(f"a{j}" for j in range(rng.randint(8,48)))
        facts=tuple(rng.sample(atoms,rng.randint(1,4)))
        rules=tuple(Rule(tuple(rng.sample(atoms,rng.randint(1,4))),rng.choice(atoms))
                    for _ in range(rng.randint(8,128)))
        closure=set(facts)
        while True:
            expanded=closure|{r.conclusion for r in rules if set(r.premises)<=closure}
            if expanded==closure:
                break
            closure=expanded
        goals=tuple(rng.sample(atoms,3))
        if i%3==0:
            goals=(facts[0], "unreachable")
        elif i%3==1:
            goals=("unreachable",)
        expected=tuple(g for g in goals if g in closure)
        status="solved" if expected==goals else "partial" if expected else "unknown"
        expected_counts[status]+=1
        result=solver.solve(goals,facts,rules)
        # Replay each goal against the combined proof prefix ending at that goal.
        verified=True
        for goal in expected:
            prefix=[]
            for step in result.steps:
                prefix.append(step)
                if step.conclusion==goal:
                    break
            verified &= verify_proof(ReasoningResult("entailed",goal,True,tuple(prefix),0,0,()),facts,rules)
        ok=(result.status==status and result.resolved==expected
            and result.unresolved==tuple(g for g in goals if g not in closure)
            and verified and not result.executable)
        if ok:
            passed+=1
        else:
            failures.append(i)
    return {"seed":seed,"cases":cases,"passed":passed,"failed_indices":tuple(failures),
            "expected_counts":expected_counts,"production_ready":False,
            "limitations":("synthetic_formal_domain","not_independent_holdout_certification")}
