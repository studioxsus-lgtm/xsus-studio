"""Indexed Horn closure, preserving v1 contracts, without the 64-round cutoff."""
from collections import defaultdict, deque
from core.intelligence.reasoning_v1 import (
    ReasoningEngine, ReasoningResult, ProofStep, _atom, verify_proof,
)

class MultiStepReasoner(ReasoningEngine):
    def _closure(self):
        known = set(self.facts)
        provenance = {a: ProofStep(a, (), None) for a in self.facts}
        waiting = defaultdict(list)
        remaining = []
        depth = {a: 0 for a in self.facts}
        for i, rule in enumerate(self.rules):
            remaining.append(len(rule.premises))
            for premise in rule.premises:
                waiting[premise].append(i)
        queue = deque(self.facts)
        while queue:
            atom = queue.popleft()
            for i in waiting[atom]:
                remaining[i] -= 1
                rule = self.rules[i]
                if remaining[i] == 0 and rule.conclusion not in known:
                    known.add(rule.conclusion)
                    provenance[rule.conclusion] = ProofStep(rule.conclusion, rule.premises, i)
                    depth[rule.conclusion] = 1 + max(depth[p] for p in rule.premises)
                    queue.append(rule.conclusion)
        rounds = max(depth.values(), default=0)
        return known, provenance, depth, rounds

    def prove(self, query):
        return self.prove_many((query,))[0]

    def prove_many(self, queries):
        if type(queries) is not tuple or not 1 <= len(queries) <= 32:
            raise ValueError("Expected 1 to 32 queries")
        for query in queries:
            _atom(query)
        closure = self._closure()
        return tuple(self._prove_from_closure(query, closure) for query in queries)

    def _prove_from_closure(self, query, closure):
        known, provenance, depth, rounds = closure
        if query not in known:
            return ReasoningResult("unknown", query, False, (), len(known), rounds,
                                   ("absence_of_proof_is_not_disproof",))
        needed = set()
        stack = [query]
        while stack:
            atom = stack.pop()
            if atom not in needed:
                needed.add(atom)
                stack.extend(provenance[atom].premises)
        proof = tuple(provenance[a] for a in sorted(needed, key=lambda a: (depth[a], a)))
        result = ReasoningResult("entailed", query, True, proof, len(known), rounds,
                                 ("valid_only_for_supplied_facts_and_rules",))
        if not verify_proof(result, self.facts, self.rules):
            raise RuntimeError("Internal proof verification failed")
        return result
