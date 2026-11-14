import { describe, expect, it, vi } from "vitest";
import { createHyperEvidencePersistence as create } from "./hyper-v8217-evidence-persistence.js";

const input = {
  observationId: "obs_1", serviceId: "srv_example",
  snapshot: {
    processId: 101, instanceId: "instance-one",
    startedAt: "2026-11-14T10:00:00Z",
    observedAt: "2026-11-14T10:01:00Z",
    source: "local-process-observation"
  }
};
const row = {
  observation_id: input.observationId, service_id: input.serviceId,
  process_id: 101, instance_id: "instance-one",
  started_at: "2026-11-14T10:00:00Z",
  observed_at: "2026-11-14T10:01:00Z",
  source: "local-process-observation"
};

describe("Hyper v8.2.17 persistence adapter", () => {
  it("rejects missing transport", () => {
    expect(() => create()).toThrow();
  });
  it("does not call transports when disabled", async () => {
    const insertRow = vi.fn(), selectRow = vi.fn();
    const adapter = create({ insertRow, selectRow });
    expect((await adapter.store(input)).reason).toBe("PERSISTENCE_DISABLED");
    expect((await adapter.read("obs_1")).reason).toBe("PERSISTENCE_DISABLED");
    expect(insertRow).not.toHaveBeenCalled();
    expect(selectRow).not.toHaveBeenCalled();
  });
  it("confirms insert with matching ID", async () => {
    const insertRow = vi.fn(async () => ({ inserted: true, observationId: "obs_1" }));
    const adapter = create({ enabled: true, insertRow, selectRow: async () => row });
    expect((await adapter.store(input)).stored).toBe(true);
    expect(insertRow).toHaveBeenCalledTimes(1);
  });
  it("rejects unconfirmed inserts", async () => {
    const adapter = create({
      enabled: true, insertRow: async () => ({ inserted: true, observationId: "wrong" }),
      selectRow: async () => row
    });
    expect((await adapter.store(input)).reason).toBe("PERSISTENCE_WRITE_FAILED");
  });
  it("reads and validates canonical snapshot", async () => {
    const adapter = create({
      enabled: true, insertRow: async () => ({}), selectRow: async () => row
    });
    const result = await adapter.read("obs_1");
    expect(result.found).toBe(true);
    expect(result.snapshot.instanceId).toBe("instance-one");
  });
  it("rejects unexpected row identity", async () => {
    const adapter = create({
      enabled: true, insertRow: async () => ({}),
      selectRow: async () => ({ ...row, observation_id: "different" })
    });
    expect((await adapter.read("obs_1")).reason).toBe("PERSISTENCE_READ_FAILED");
  });
});
