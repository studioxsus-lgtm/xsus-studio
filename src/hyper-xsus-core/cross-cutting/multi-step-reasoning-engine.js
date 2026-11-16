/** Read-only multi-step inference from explicitly supplied facts and rules. */
export const MULTI_STEP_REASONING_VERSION = "1.0.0";
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
export function createMultiStepReasoningEngine({ maxFacts = 1024, maxRules = 1024, maxRounds = 64 } = {}) {
  for (const n of [maxFacts,maxRules,maxRounds])
    if (!Number.isSafeInteger(n) || n < 1 || n > 10000) throw new TypeError("Invalid reasoning configuration.");
  function reason({ facts = [], rules = [] } = {}) {
    if (!Array.isArray(facts) || facts.length > maxFacts || !Array.isArray(rules) || rules.length > maxRules)
      throw new TypeError("Invalid reasoning input.");
    const known = new Set();
    for (const fact of facts) {
      if (typeof fact !== "string" || !ID.test(fact) || known.has(fact))
        throw new TypeError("Invalid reasoning fact.");
      known.add(fact);
    }
    const ids = new Set();
    const validated = rules.map(rule => {
      if (!rule || typeof rule.id !== "string" || !ID.test(rule.id) || ids.has(rule.id) ||
          typeof rule.conclusion !== "string" || !ID.test(rule.conclusion) ||
          !Array.isArray(rule.premises) || rule.premises.length > 64 ||
          rule.premises.some(p => typeof p !== "string" || !ID.test(p)) ||
          new Set(rule.premises).size !== rule.premises.length)
        throw new TypeError("Invalid reasoning rule.");
      ids.add(rule.id);
      return { id: rule.id, conclusion: rule.conclusion, premises: [...rule.premises] };
    }).sort((a,b) => a.id.localeCompare(b.id));
    const steps = [];
    const provenance = new Map([...known].map(fact => [fact, Object.freeze({ fact, source: "input", ruleId: null })]));
    let rounds = 0, changed = true;
    while (changed && rounds < maxRounds) {
      changed = false; rounds++;
      for (const rule of validated) {
        if (!known.has(rule.conclusion) && rule.premises.every(p => known.has(p))) {
          known.add(rule.conclusion);
          provenance.set(rule.conclusion, Object.freeze({ fact: rule.conclusion, source: "derived", ruleId: rule.id }));
          steps.push(Object.freeze({ ruleId: rule.id, conclusion: rule.conclusion,
            premises: Object.freeze([...rule.premises]) }));
          changed = true;
        }
      }
    }
    const incomplete = validated.some(rule =>
      !known.has(rule.conclusion) && rule.premises.every(p => known.has(p)));
    return Object.freeze({ version: MULTI_STEP_REASONING_VERSION,
      facts: Object.freeze([...known].sort()), steps: Object.freeze(steps),
      provenance: Object.freeze([...provenance.values()].sort((a,b) => a.fact.localeCompare(b.fact))),
      rounds, incomplete, method: "forward-chaining", externallyVerified: false });
  }
  return Object.freeze({ version: MULTI_STEP_REASONING_VERSION, reason });
}
