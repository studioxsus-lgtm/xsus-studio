/**
 * Hyper v8.2.16 — runtime evidence row contract.
 * Pure conversion and validation; no database connection or writes.
 */
export const HYPER_RUNTIME_EVIDENCE_SCHEMA_VERSION = "8.2.16";
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const INSTANCE = /^[A-Za-z0-9-]{8,128}$/;
const timestamp = x => typeof x === "string" && Number.isFinite(Date.parse(x));

export function prepareHyperRuntimeEvidenceRow({ observationId, serviceId, snapshot } = {}) {
  if (!ID.test(observationId || "") || !ID.test(serviceId || "") ||
      !snapshot || snapshot.source !== "local-process-observation" ||
      !INSTANCE.test(snapshot.instanceId || "") ||
      !Number.isSafeInteger(snapshot.processId) || snapshot.processId <= 0 ||
      !timestamp(snapshot.startedAt) || !timestamp(snapshot.observedAt) ||
      Date.parse(snapshot.startedAt) > Date.parse(snapshot.observedAt))
    throw new TypeError("Hyper runtime evidence row invalid.");

  return Object.freeze({
    observation_id: observationId,
    service_id: serviceId,
    instance_id: snapshot.instanceId,
    process_id: snapshot.processId,
    started_at: snapshot.startedAt,
    observed_at: snapshot.observedAt,
    source: "local-process-observation"
  });
}
