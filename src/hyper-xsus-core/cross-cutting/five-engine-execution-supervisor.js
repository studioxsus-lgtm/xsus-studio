/**
 * Hyper XSUS Core — Five Engine Execution Supervisor v1.0.0.
 * Composes resource admission, concurrency, result integrity and private metrics.
 * No retries, external I/O, cancellation, persistence or implicit authorization.
 */
import { createFiveEngineResourceBudget } from "./five-engine-resource-budget.js";
import { createFiveEngineConcurrencyGate } from "./five-engine-concurrency-gate.js";
import { createFiveEngineResultIntegrityGate } from "./five-engine-result-integrity-gate.js";
import { createFiveEngineDiagnostics } from "./five-engine-diagnostics.js";
export const FIVE_ENGINE_SUPERVISOR_VERSION = "1.0.0";
export function createFiveEngineExecutionSupervisor({
  workflow, maxConcurrent = 4, maxResults = 256, budget = {}
} = {}) {
  if (!workflow || typeof workflow.run !== "function" ||
      !budget || typeof budget !== "object" || Array.isArray(budget))
    throw new TypeError("Invalid five-engine supervisor configuration.");
  const resources = createFiveEngineResourceBudget(budget);
  const capacity = createFiveEngineConcurrencyGate({ workflow, maxConcurrent });
  const integrity = createFiveEngineResultIntegrityGate({ maxResults });
  const diagnostics = createFiveEngineDiagnostics({ maxEngines: maxResults });
  let verified = 0, failed = 0;
  async function run(input) {
    // Admission is entirely synchronous and precedes all specialist execution.
    try {
      resources.check(input);
      const result = await capacity.run(input);
      const check = integrity.verify(result);
      if (!check.valid) {
        const error = new Error("Supervised workflow integrity verification failed.");
        error.code = "HYPER_SUPERVISOR_INTEGRITY_FAILED";
        throw error;
      }
      const summary = diagnostics.summarize(result);
      verified++;
      return Object.freeze({ result, diagnostics: summary });
    } catch (error) {
      failed++;
      throw error;
    }
  }
  function stats() {
    return Object.freeze({
      ...capacity.stats(),
      version: FIVE_ENGINE_SUPERVISOR_VERSION,
      verified, failed,
      retriesPerformed: 0
    });
  }
  return Object.freeze({ version: FIVE_ENGINE_SUPERVISOR_VERSION, run, stats });
}
