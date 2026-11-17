/**
 * Hyper XSUS Core — Concurrent Workflow Admission v1.0.0.
 * Limits active workflow calls; rejects excess immediately (no unbounded queue).
 * A slot is always released after success or failure.
 * Does not cancel a workflow already running or guarantee side-effect isolation.
 */
export const FIVE_ENGINE_CONCURRENCY_VERSION = "1.0.0";
export function createFiveEngineConcurrencyGate({ workflow, maxConcurrent = 4 } = {}) {
  if (!workflow || typeof workflow.run !== "function" ||
      !Number.isSafeInteger(maxConcurrent) || maxConcurrent < 1 || maxConcurrent > 256)
    throw new TypeError("Invalid workflow concurrency configuration.");
  let active = 0;
  let accepted = 0;
  let rejected = 0;
  const capacityErrors = new WeakSet();
  function stats() {
    return Object.freeze({ version: FIVE_ENGINE_CONCURRENCY_VERSION,
      active, maxConcurrent, accepted, rejected });
  }
  async function run(input) {
    if (active >= maxConcurrent) {
      rejected++;
      const error = new Error("Workflow concurrency limit exceeded.");
      error.code = "HYPER_WORKFLOW_CAPACITY_EXCEEDED";
      capacityErrors.add(error);
      throw error;
    }
    active++;
    accepted++;
    try {
      return await workflow.run(input);
    } finally {
      active--;
    }
  }
  function isCapacityRejection(error) {
    return !!error && typeof error === "object" && capacityErrors.has(error);
  }
  return Object.freeze({ version: FIVE_ENGINE_CONCURRENCY_VERSION, run, stats, isCapacityRejection });
}
