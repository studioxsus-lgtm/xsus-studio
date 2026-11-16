/**
 * Hyper XSUS Core — Engine Execution Budget v1.0.0
 * Enforces total engine attempts and output counts per request.
 * This is a synchronous budget, not a wall-clock timeout or a billing meter.
 */
export const ENGINE_EXECUTION_BUDGET_VERSION = "1.0.0";
export function createEngineExecutionBudget({ maxAttempts = 16, maxOutputs = 64 } = {}) {
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 100000 ||
      !Number.isSafeInteger(maxOutputs) || maxOutputs < 1 || maxOutputs > 100000)
    throw new TypeError("Invalid execution budget configuration.");
  let attempts = 0, outputs = 0;
  function claimAttempt() {
    if (attempts >= maxAttempts) {
      const error = new Error("Engine execution attempt budget exhausted.");
      error.code = "HYPER_ENGINE_BUDGET_EXCEEDED";
      throw error;
    }
    attempts++;
    return attempts;
  }
  function claimOutput() {
    if (outputs >= maxOutputs) {
      const error = new Error("Engine execution output budget exhausted.");
      error.code = "HYPER_ENGINE_BUDGET_EXCEEDED";
      throw error;
    }
    outputs++;
    return outputs;
  }
  function snapshot() {
    return Object.freeze({ attempts, outputs, remainingAttempts: maxAttempts - attempts,
      remainingOutputs: maxOutputs - outputs });
  }
  return Object.freeze({ version: ENGINE_EXECUTION_BUDGET_VERSION,
    claimAttempt, claimOutput, snapshot });
}
