/** Evidence-based response scoring; no claim of factual verification. */
import { createLanguageQualityGate } from "./language-quality-gate.js";
export const RESPONSE_EVALUATION_VERSION = "1.0.0";
export function createResponseEvaluationEngine({ minimumScore = 0.8 } = {}) {
  const gate = createLanguageQualityGate({ requiredChecks: ["coherence","completeness","safety"], minimumScore });
  function evaluate({ checks, findings = [] } = {}) {
    const result = gate.evaluate({ checks, findings });
    const values = result.scores.filter(s => ["coherence","completeness","safety"].includes(s.name));
    const overall = values.length === 3 ? values.reduce((sum,s) => sum + s.score, 0) / 3 : null;
    return Object.freeze({ version: RESPONSE_EVALUATION_VERSION,
      status: result.status, accepted: result.passed, overallScore: overall,
      missingChecks: result.missingChecks, belowThreshold: result.belowThreshold,
      errorCount: result.errorCount, evidenceBased: true, factualAccuracyVerified: false });
  }
  return Object.freeze({ version: RESPONSE_EVALUATION_VERSION, evaluate });
}
