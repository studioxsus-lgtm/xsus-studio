import { describe, expect, it } from "vitest";
import { prepareHyperRuntimeEvidenceRow as prepare } from "./hyper-v8216-runtime-evidence-schema.js";

const valid = () => ({
  observationId: "observation_1", serviceId: "srv_example",
  snapshot: {
    instanceId: "instance-one", processId: 101,
    startedAt: "2026-11-14T10:00:00Z",
    observedAt: "2026-11-14T10:01:00Z",
    source: "local-process-observation"
  }
});

describe("Hyper v8.2.16 runtime evidence row contract", () => {
  it("creates immutable row", () => {
    const row = prepare(valid());
    expect(row.observation_id).toBe("observation_1");
    expect(Object.isFrozen(row)).toBe(true);
  });
  it("rejects invalid service identifiers", () => {
    const v = valid(); v.serviceId = "../bad";
    expect(() => prepare(v)).toThrow();
  });
  it("rejects negative process IDs", () => {
    const v = valid(); v.snapshot.processId = -1;
    expect(() => prepare(v)).toThrow();
  });
  it("rejects reversed chronology", () => {
    const v = valid(); v.snapshot.observedAt = "2026-11-14T09:00:00Z";
    expect(() => prepare(v)).toThrow();
  });
  it("rejects untrusted snapshot source", () => {
    const v = valid(); v.snapshot.source = "client";
    expect(() => prepare(v)).toThrow();
  });
});
