/**
 * Hyper v8.2.14 — runtime lifecycle evidence capture.
 * Captures process identity at runtime, without making deployment or restart
 * claims. A trusted external durable store must persist snapshots across boots.
 * Never use PID alone as identity; process start time and boot nonce matter.
 */
import { randomUUID } from "node:crypto";

export const HYPER_RUNTIME_LIFECYCLE_VERSION = "8.2.14";

export function createHyperRuntimeLifecycle({
  processId = process.pid,
  startedAt = new Date(Date.now() - process.uptime() * 1000).toISOString(),
  instanceId = randomUUID(),
  clock = () => new Date().toISOString()
} = {}) {
  if (!Number.isSafeInteger(processId) || processId <= 0 ||
      typeof instanceId !== "string" || !/^[a-zA-Z0-9-]{8,128}$/.test(instanceId) ||
      !Number.isFinite(Date.parse(startedAt)))
    throw new TypeError("Runtime lifecycle configuration invalid.");
  const identity = Object.freeze({ processId, startedAt, instanceId });
  return Object.freeze({
    version: HYPER_RUNTIME_LIFECYCLE_VERSION,
    snapshot() {
      const observedAt = clock();
      if (typeof observedAt !== "string" || !Number.isFinite(Date.parse(observedAt)))
        throw new TypeError("Invalid runtime observation timestamp.");
      return Object.freeze({ ...identity, observedAt, source: "local-process-observation" });
    }
  });
}

/**
 * Structural comparison only. Neither observation is authenticated by this
 * module; the caller must verify independent, durable provenance.
 */
export function compareHyperRuntimeSnapshots(before, after) {
  const blockers = [];
  for (const item of [before, after]) {
    if (!item || item.source !== "local-process-observation" ||
        !Number.isSafeInteger(item.processId) || item.processId <= 0 ||
        typeof item.instanceId !== "string" || !/^[a-zA-Z0-9-]{8,128}$/.test(item.instanceId) ||
        !Number.isFinite(Date.parse(item.startedAt)) ||
        !Number.isFinite(Date.parse(item.observedAt))) {
      blockers.push("INVALID_RUNTIME_SNAPSHOT");
      break;
    }
  }
  if (!blockers.length) {
    if (before.instanceId === after.instanceId)
      blockers.push("SAME_RUNTIME_INSTANCE");
    if (Date.parse(before.observedAt) >= Date.parse(after.startedAt) ||
        Date.parse(after.startedAt) > Date.parse(after.observedAt))
      blockers.push("RUNTIME_CHRONOLOGY_INVALID");
  }
  blockers.push("DURABLE_PROVENANCE_NOT_VERIFIED");
  return Object.freeze({
    version: HYPER_RUNTIME_LIFECYCLE_VERSION,
    verified: false,
    blockers: Object.freeze([...new Set(blockers)].sort()),
    source: "unattested-runtime-comparison"
  });
}
