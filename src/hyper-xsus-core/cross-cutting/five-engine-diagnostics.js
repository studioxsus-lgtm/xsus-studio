/**
 * Hyper XSUS Core — Five Engine Workflow Diagnostics v1.0.0
 * Privacy-minimized read-only telemetry from completed workflow outputs.
 * No source text, prompt, evidence text, or specialist payload is retained.
 */
export const FIVE_ENGINE_DIAGNOSTICS_VERSION = "1.0.0";
const STATUS = new Set(["completed", "degraded", "quality-rejected"]);
const COUNT = n => Number.isSafeInteger(n) && n >= 0;
export function createFiveEngineDiagnostics({ maxEngines = 256 } = {}) {
  if (!Number.isSafeInteger(maxEngines) || maxEngines < 1 || maxEngines > 10000)
    throw new TypeError("Invalid workflow diagnostics configuration.");
  function summarize(result) {
    if (!result || !STATUS.has(result.status) ||
        !result.semantic || !Array.isArray(result.semantic.ranked) ||
        !result.reasoning || !Array.isArray(result.reasoning.steps) ||
        !result.plan || !Array.isArray(result.plan.steps) ||
        !result.quality || typeof result.quality.accepted !== "boolean")
      throw new TypeError("Invalid workflow diagnostics input.");
    const rejected = result.status === "quality-rejected";
    const coordination = result.coordination;
    if (rejected ? (coordination !== null || result.executionAttempted !== false || result.quality.accepted)
      : (!coordination || !result.quality.accepted || !COUNT(coordination.completed) ||
         !COUNT(coordination.failed) || !Array.isArray(coordination.results) ||
         coordination.results.length > maxEngines ||
         coordination.completed + coordination.failed !== coordination.results.length ||
         (result.status === "completed" && coordination.failed !== 0) ||
         (result.status === "degraded" && coordination.failed === 0)))
      throw new TypeError("Inconsistent workflow diagnostics state.");
    return Object.freeze({
      version: FIVE_ENGINE_DIAGNOSTICS_VERSION,
      status: result.status,
      evidenceCount: result.semantic.ranked.length,
      inferenceSteps: result.reasoning.steps.length,
      plannedTasks: result.plan.steps.length,
      qualityAccepted: result.quality.accepted,
      enginesCompleted: rejected ? 0 : coordination.completed,
      enginesFailed: rejected ? 0 : coordination.failed,
      executionAttempted: result.executionAttempted === true,
      includesUserContent: false
    });
  }
  return Object.freeze({ version: FIVE_ENGINE_DIAGNOSTICS_VERSION, summarize });
}
