/**
 * Hyper XSUS Core — Workflow Result Integrity Gate v1.0.0
 * Validates structural consistency across all five workflow stages.
 * Does not authenticate the origin of results or establish factual truth.
 */
export const FIVE_ENGINE_RESULT_INTEGRITY_VERSION = "1.0.0";
const STATUS = new Set(["completed", "degraded", "quality-rejected"]);
const count = n => Number.isSafeInteger(n) && n >= 0;
export function createFiveEngineResultIntegrityGate({ maxResults = 256 } = {}) {
  if (!Number.isSafeInteger(maxResults) || maxResults < 1 || maxResults > 10000)
    throw new TypeError("Invalid result integrity configuration.");
  function verify(result) {
    if (!result || typeof result !== "object" || !STATUS.has(result.status) ||
        !result.semantic || !Array.isArray(result.semantic.ranked) ||
        !result.reasoning || !Array.isArray(result.reasoning.facts) ||
        !Array.isArray(result.reasoning.steps) ||
        !result.plan || !Array.isArray(result.plan.steps) ||
        !result.quality || typeof result.quality.accepted !== "boolean" ||
        typeof result.executionAttempted !== "boolean")
      throw new TypeError("Invalid five-engine result.");
    const errors = [];
    const coordination = result.coordination;
    if (result.status === "quality-rejected") {
      if (result.quality.accepted || coordination !== null || result.executionAttempted)
        errors.push("QUALITY_REJECTION_INCONSISTENT");
    } else {
      if (!result.quality.accepted || !coordination ||
          !count(coordination.completed) || !count(coordination.failed) ||
          !Array.isArray(coordination.results) || coordination.results.length > maxResults ||
          coordination.completed + coordination.failed !== coordination.results.length)
        errors.push("COORDINATION_INCONSISTENT");
      else {
        const failed = coordination.failed;
        if ((result.status === "completed" && failed !== 0) ||
            (result.status === "degraded" && failed === 0))
          errors.push("STATUS_INCONSISTENT");
        if (coordination.results.length > 0 && !result.executionAttempted)
          errors.push("EXECUTION_FLAG_INCONSISTENT");
      }
    }
    const steps = result.plan.steps;
    const seen = new Set();
    for (const step of steps) {
      if (!step || typeof step.id !== "string" || seen.has(step.id)) {
        errors.push("PLAN_STEPS_INCONSISTENT");
        break;
      }
      seen.add(step.id);
    }
    return Object.freeze({
      version: FIVE_ENGINE_RESULT_INTEGRITY_VERSION,
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      factualTruthVerified: false,
      provenanceAuthenticated: false
    });
  }
  return Object.freeze({ version: FIVE_ENGINE_RESULT_INTEGRITY_VERSION, verify });
}
