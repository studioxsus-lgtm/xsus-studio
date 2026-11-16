/**
 * Hyper XSUS Core — Recovery Fault-Tolerance Engine v1.0.0
 * Conservative circuit breaker for recovery infrastructure. No automatic
 * retry of anchor mutations or reconciliation actions. Single-process
 * coordination only; production deployments need a shared health store.
 */
export const RECOVERY_FAULT_TOLERANCE_VERSION = "1.0.0";
export function createRecoveryFaultToleranceEngine({
  threshold = 3, cooldownMs = 30000, clock = () => Date.now()
} = {}) {
  if (!Number.isSafeInteger(threshold) || threshold < 1 || threshold > 100 ||
      !Number.isSafeInteger(cooldownMs) || cooldownMs < 0 || cooldownMs > 86400000 ||
      typeof clock !== "function") throw new TypeError("Invalid recovery fault tolerance configuration.");
  let failures = 0, openedAt = null, probeInFlight = false;
  const now = () => {
    const value = clock();
    if (!Number.isSafeInteger(value) || value < 0) throw new TypeError("Invalid recovery clock.");
    return value;
  };
  function status() {
    const t = now();
    const mode = openedAt === null ? "closed" :
      t - openedAt >= cooldownMs ? "half-open" : "open";
    return Object.freeze({ mode, failures, probeInFlight });
  }
  async function check(operation) {
    if (typeof operation !== "function") throw new TypeError("Recovery operation required.");
    const current = status();
    if (current.mode === "open" ||
        (current.mode === "half-open" && probeInFlight)) {
      const error = new Error("Recovery circuit breaker is open.");
      error.code = "RECOVERY_CIRCUIT_OPEN";
      throw error;
    }
    if (current.mode === "half-open") probeInFlight = true;
    try {
      const value = await operation();
      failures = 0;
      openedAt = null;
      return value;
    } catch (error) {
      failures = Math.min(threshold, failures + 1);
      if (failures >= threshold || current.mode === "half-open") openedAt = now();
      throw error;
    } finally {
      if (current.mode === "half-open") probeInFlight = false;
    }
  }
  function trip() {
    failures = threshold;
    openedAt = now();
  }
  return Object.freeze({ version: RECOVERY_FAULT_TOLERANCE_VERSION, check, trip, status });
}
