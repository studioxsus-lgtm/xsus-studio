/**
 * Hyper XSUS Core — Five Engine Batch Runner v1.0.0.
 * Bounded sequential workflow processing with immutable per-item outcomes.
 * Does not retry side-effectful specialist operations.
 */
export const FIVE_ENGINE_BATCH_VERSION = "1.0.0";
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
export function createFiveEngineBatchRunner({ workflow, maxItems = 32, stopOnFailure = false } = {}) {
  if (!workflow || typeof workflow.run !== "function" ||
      !Number.isSafeInteger(maxItems) || maxItems < 1 || maxItems > 1000 ||
      typeof stopOnFailure !== "boolean")
    throw new TypeError("Invalid five engine batch configuration.");
  async function run({ items } = {}) {
    if (!Array.isArray(items) || items.length > maxItems)
      throw new TypeError("Invalid five engine batch items.");
    // Entire batch must have unique valid IDs before any workflow runs.
    const seen = new Set();
    const prepared = items.map(item => {
      if (!item || typeof item.id !== "string" || !ID.test(item.id) ||
          seen.has(item.id) || !item.input || typeof item.input !== "object" ||
          Array.isArray(item.input))
        throw new TypeError("Invalid five engine batch item.");
      seen.add(item.id);
      return { id: item.id, input: item.input };
    });
    const outcomes = [];
    let stopped = false;
    for (const item of prepared) {
      if (stopped) {
        outcomes.push(Object.freeze({ id: item.id, status: "skipped", result: null, errorCode: null }));
        continue;
      }
      try {
        const result = await workflow.run(item.input);
        if (!result || !["completed", "degraded", "quality-rejected"].includes(result.status))
          throw new TypeError("Invalid five engine workflow outcome.");
        outcomes.push(Object.freeze({ id: item.id, status: result.status, result, errorCode: null }));
        if (stopOnFailure && result.status !== "completed") stopped = true;
      } catch {
        // No exception details or sensitive payloads in batch diagnostics.
        outcomes.push(Object.freeze({
          id: item.id, status: "failed", result: null, errorCode: "WORKFLOW_FAILED"
        }));
        if (stopOnFailure) stopped = true;
      }
    }
    const counts = { completed: 0, degraded: 0, "quality-rejected": 0, failed: 0, skipped: 0 };
    for (const item of outcomes) counts[item.status]++;
    return Object.freeze({
      version: FIVE_ENGINE_BATCH_VERSION,
      outcomes: Object.freeze(outcomes),
      counts: Object.freeze(counts),
      attempted: outcomes.length - counts.skipped,
      stoppedEarly: stopped && counts.skipped > 0,
      retryPerformed: false
    });
  }
  return Object.freeze({ version: FIVE_ENGINE_BATCH_VERSION, run });
}
