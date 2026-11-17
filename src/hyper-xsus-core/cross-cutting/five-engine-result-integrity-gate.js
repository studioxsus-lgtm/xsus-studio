/**
 * Hyper XSUS Core — Workflow Result Integrity Gate v1.0.0
 * Validates structural consistency across all five workflow stages.
 * Does not authenticate the origin of results or establish factual truth.
 */
export const FIVE_ENGINE_RESULT_INTEGRITY_VERSION = "1.0.0";
const STATUS = new Set(["completed", "degraded", "quality-rejected"]);
const PLAN_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const count = n => Number.isSafeInteger(n) && n >= 0;
export function createFiveEngineResultIntegrityGate({ maxResults = 256 } = {}) {
  if (!Number.isSafeInteger(maxResults) || maxResults < 1 || maxResults > 10000)
    throw new TypeError("Invalid result integrity configuration.");
  function verify(input) {
    // Snapshot the workflow envelope before inspecting any stage.
    // Own data descriptors prevent caller-supplied getters from executing.
    const record = value => value && typeof value === "object" && !Array.isArray(value) &&
      (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
    const snapshot = (value, names) => {
      if (!record(value)) throw new TypeError("Invalid five-engine result.");
      const copy = Object.create(null);
      for (const name of names) {
        const descriptor = Object.getOwnPropertyDescriptor(value, name);
        if (!descriptor || !Object.hasOwn(descriptor, "value"))
          throw new TypeError("Invalid five-engine result.");
        copy[name] = descriptor.value;
      }
      return copy;
    };
    const result = snapshot(input, ["status", "semantic", "reasoning", "plan",
      "quality", "coordination", "executionAttempted"]);
    result.semantic = snapshot(result.semantic, ["ranked"]);
    result.reasoning = snapshot(result.reasoning, ["facts", "steps"]);
    result.plan = snapshot(result.plan, ["steps"]);
    result.quality = snapshot(result.quality, ["accepted"]);
    if (record(result.coordination))
      result.coordination = snapshot(result.coordination, ["completed", "failed", "results"]);
    if (!STATUS.has(result.status) ||
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
        if (result.executionAttempted !== (coordination.results.length > 0))
          errors.push("EXECUTION_FLAG_INCONSISTENT");
        let completed = 0;
        let failedCount = 0;
        const engineNames = new Set();
        for (let index = 0; index < coordination.results.length; index++) {
          const slot = Object.getOwnPropertyDescriptor(coordination.results, String(index));
          if (!slot || !Object.hasOwn(slot, "value")) {
            errors.push("COORDINATION_RESULTS_INCONSISTENT");
            break;
          }
          const entry = slot.value;
          if (!entry || typeof entry !== "object" || Array.isArray(entry) ||
              (Object.getPrototypeOf(entry) !== Object.prototype && Object.getPrototypeOf(entry) !== null)) {
            errors.push("COORDINATION_RESULTS_INCONSISTENT");
            break;
          }
          const read = name => {
            const descriptor = Object.getOwnPropertyDescriptor(entry, name);
            return descriptor && Object.hasOwn(descriptor, "value")
              ? { valid: true, value: descriptor.value } : { valid: false };
          };
          const engine = read("engine");
          const status = read("status");
          const output = read("output");
          if (!engine.valid || typeof engine.value !== "string" ||
              !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(engine.value) ||
              engineNames.has(engine.value) || !status.valid ||
              (status.value !== "completed" && status.value !== "failed") ||
              !output.valid ||
              (status.value === "failed" && output.value !== null) ||
              (status.value === "completed" && output.value === undefined)) {
            errors.push("COORDINATION_RESULTS_INCONSISTENT");
            break;
          }
          engineNames.add(engine.value);
          if (status.value === "completed") completed++;
          else failedCount++;
        }
        if (!errors.includes("COORDINATION_RESULTS_INCONSISTENT") &&
            (completed !== coordination.completed || failedCount !== coordination.failed))
          errors.push("COORDINATION_RESULTS_INCONSISTENT");
      }
    }
    const steps = result.plan.steps;
    // Bound adversarial plan payloads before scanning individual descriptors.
    if (steps.length > 10000) {
      errors.push("PLAN_STEPS_INCONSISTENT");
    }
    const seen = new Set();
    for (let index = 0; index < (steps.length > 10000 ? 0 : steps.length); index++) {
      const slot = Object.getOwnPropertyDescriptor(steps, String(index));
      if (!slot || !Object.hasOwn(slot, "value")) {
        errors.push("PLAN_STEPS_INCONSISTENT");
        break;
      }
      const step = slot.value;
      if (!step || typeof step !== "object" || Array.isArray(step) ||
          (Object.getPrototypeOf(step) !== Object.prototype && Object.getPrototypeOf(step) !== null)) {
        errors.push("PLAN_STEPS_INCONSISTENT");
        break;
      }
      const idField = Object.getOwnPropertyDescriptor(step, "id");
      if (!idField || !Object.hasOwn(idField, "value") ||
          typeof idField.value !== "string" || !PLAN_ID.test(idField.value) ||
          seen.has(idField.value)) {
        errors.push("PLAN_STEPS_INCONSISTENT");
        break;
      }
      seen.add(idField.value);
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
