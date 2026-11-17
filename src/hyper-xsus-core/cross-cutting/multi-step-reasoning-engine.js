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
    for (let index = 0; index < facts.length; index++) {
      const descriptor = Object.getOwnPropertyDescriptor(facts, String(index));
      if (!descriptor || !Object.hasOwn(descriptor, "value"))
        throw new TypeError("Invalid reasoning fact.");
      const fact = descriptor.value;
      if (typeof fact !== "string" || !ID.test(fact) || known.has(fact))
        throw new TypeError("Invalid reasoning fact.");
      known.add(fact);
    }
    const ids = new Set();
    const validated = Array.from({ length: rules.length }, (_, index) => {
      const entry = Object.getOwnPropertyDescriptor(rules, String(index));
      if (!entry || !Object.hasOwn(entry, "value"))
        throw new TypeError("Invalid reasoning rule.");
      const rule = entry.value;
      if (!rule || typeof rule !== "object" || Array.isArray(rule) ||
          (Object.getPrototypeOf(rule) !== Object.prototype && Object.getPrototypeOf(rule) !== null))
        throw new TypeError("Invalid reasoning rule.");
      const fields = Object.create(null);
      for (const name of ["id", "conclusion", "premises"]) {
        const descriptor = Object.getOwnPropertyDescriptor(rule, name);
        if (!descriptor || !Object.hasOwn(descriptor, "value"))
          throw new TypeError("Invalid reasoning rule.");
        fields[name] = descriptor.value;
      }
      if (typeof fields.id !== "string" || !ID.test(fields.id) || ids.has(fields.id) ||
          typeof fields.conclusion !== "string" || !ID.test(fields.conclusion) ||
          !Array.isArray(fields.premises) || fields.premises.length > 64)
        throw new TypeError("Invalid reasoning rule.");
      const premises = Array.from({ length: fields.premises.length }, (_, i) => {
        const descriptor = Object.getOwnPropertyDescriptor(fields.premises, String(i));
        if (!descriptor || !Object.hasOwn(descriptor, "value"))
          throw new TypeError("Invalid reasoning premise.");
        const premise = descriptor.value;
        if (typeof premise !== "string" || !ID.test(premise))
          throw new TypeError("Invalid reasoning premise.");
        return premise;
      });
      if (new Set(premises).size !== premises.length)
        throw new TypeError("Invalid reasoning rule.");
      ids.add(fields.id);
      return { id: fields.id, conclusion: fields.conclusion, premises };
    }).sort((a,b) => a.id.localeCompare(b.id));
    const steps = [];
    const provenance = new Map([...known].map(fact => [fact, Object.freeze({ fact, source: "input", ruleId: null })]));
    let rounds = 0, changed = true;
    while (changed && rounds < maxRounds) {
      changed = false; rounds++;
      // Each round reasons from a fixed snapshot, independent of rule ordering.
      const roundFacts = new Set(known);
      for (const rule of validated) {
        if (!known.has(rule.conclusion) && rule.premises.every(p => roundFacts.has(p))) {
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
