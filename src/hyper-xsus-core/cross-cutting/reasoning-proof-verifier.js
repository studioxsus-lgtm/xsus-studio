/**
 * Hyper XSUS Core — Reasoning Proof Verifier v1.0.0.
 * Checks that every derived step follows an explicitly supplied rule and
 * previously established premises. This verifies derivation, NOT factual truth.
 */
export const REASONING_PROOF_VERIFIER_VERSION = "1.0.0";
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
export function createReasoningProofVerifier({ maxFacts = 1024, maxRules = 1024, maxSteps = 10000 } = {}) {
  for (const n of [maxFacts,maxRules,maxSteps])
    if (!Number.isSafeInteger(n) || n < 1 || n > 100000)
      throw new TypeError("Invalid reasoning proof verifier configuration.");
  function verify({ facts, rules, proof } = {}) {
    if (!Array.isArray(facts) || facts.length > maxFacts ||
        !Array.isArray(rules) || rules.length > maxRules ||
        !proof || !Array.isArray(proof.steps) || proof.steps.length > maxSteps ||
        !Array.isArray(proof.facts) || proof.facts.length > maxFacts + maxSteps)
      throw new TypeError("Invalid reasoning proof input.");
    const known = new Set();
    for (const fact of facts) {
      if (typeof fact !== "string" || !ID.test(fact) || known.has(fact))
        throw new TypeError("Invalid reasoning proof fact.");
      known.add(fact);
    }
    const byId = new Map();
    for (const rule of rules) {
      if (!rule || typeof rule.id !== "string" || !ID.test(rule.id) ||
          byId.has(rule.id) || typeof rule.conclusion !== "string" ||
          !ID.test(rule.conclusion) || !Array.isArray(rule.premises) ||
          rule.premises.length > 64 ||
          rule.premises.some(p => typeof p !== "string" || !ID.test(p)) ||
          new Set(rule.premises).size !== rule.premises.length)
        throw new TypeError("Invalid reasoning proof rule.");
      byId.set(rule.id, rule);
    }
    const failures = [];
    for (let i = 0; i < proof.steps.length; i++) {
      const step = proof.steps[i];
      const rule = step && byId.get(step.ruleId);
      if (!rule || step.conclusion !== rule.conclusion ||
          !Array.isArray(step.premises) ||
          step.premises.length !== rule.premises.length ||
          step.premises.some((p,j) => p !== rule.premises[j]) ||
          known.has(step.conclusion) ||
          !rule.premises.every(p => known.has(p))) {
        failures.push(i);
        break;
      }
      known.add(step.conclusion);
    }
    const expected = [...known].sort();
    const validFinal = proof.facts.length === expected.length &&
      proof.facts.every((fact,i) => fact === expected[i]);
    const verified = failures.length === 0 && validFinal;
    return Object.freeze({
      version: REASONING_PROOF_VERIFIER_VERSION,
      verified, stepCount: proof.steps.length,
      failureIndex: failures.length ? failures[0] : (validFinal ? null : proof.steps.length),
      factualTruthVerified: false
    });
  }
  return Object.freeze({ version: REASONING_PROOF_VERIFIER_VERSION, verify });
}
