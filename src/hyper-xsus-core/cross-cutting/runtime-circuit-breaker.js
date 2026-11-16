/** Injected-clock runtime circuit breaker; no background timers. */
export const RUNTIME_CIRCUIT_BREAKER_VERSION = "1.0.0";
export function createRuntimeCircuitBreaker({
  failureThreshold = 3, resetAfterMs = 30000, clock = Date.now
} = {}) {
  if (!Number.isSafeInteger(failureThreshold) || failureThreshold < 1 ||
      !Number.isSafeInteger(resetAfterMs) || resetAfterMs < 1 ||
      typeof clock !== "function") throw new TypeError("Invalid circuit breaker configuration.");
  let failures = 0, openedAt = null, probe = false;
  let generation = 0;
  function status() {
    const now = clock();
    if (!Number.isFinite(now)) throw new TypeError("Invalid circuit breaker clock.");
    return Object.freeze({ state: openedAt === null ? "closed" :
      now - openedAt >= resetAfterMs ? "half-open" : "open", failures });
  }
  async function execute(operation) {
    if (typeof operation !== "function") throw new TypeError("Operation must be a function.");
    const state = status().state;
    if (state === "open" || (state === "half-open" && probe))
      throw new Error("Circuit breaker unavailable.");
    if (state === "half-open") probe = true;
    const attemptGeneration = generation;
    try {
      const result = await operation();
      if (state === "half-open" || (openedAt === null && attemptGeneration === generation)) {
        failures = 0; openedAt = null;
        generation++;
      }
      return result;
    } catch (error) {
      if (state === "half-open" || (openedAt === null && attemptGeneration === generation)) {
        failures = state === "half-open" ? failureThreshold : failures + 1;
        if (failures >= failureThreshold) { openedAt = clock(); generation++; }
      }
      throw error;
    } finally { if (state === "half-open") probe = false; }
  }
  return Object.freeze({ version: RUNTIME_CIRCUIT_BREAKER_VERSION, status, execute });
}
