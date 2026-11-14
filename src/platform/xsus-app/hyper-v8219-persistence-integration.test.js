import { describe, expect, it, vi } from "vitest";
import { createHyperPersistenceIntegration as create } from "./hyper-v8219-persistence-integration.js";

const config = fetchImpl => ({
  url: "https://example.supabase.co",
  serviceRoleKey: "test-key", fetchImpl
});
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
  observation_id: "obs_1", service_id: "srv_example",
  process_id: 101, instance_id: "instance-one",
  started_at: "2026-11-14T10:00:00Z",
  observed_at: "2026-11-14T10:01:00Z",
  source: "local-process-observation"
};

describe("Hyper v8.2.19 persistence integration", () => {
  it("does not call Supabase while disabled", async () => {
    const fetchImpl = vi.fn();
    const integration = create(config(fetchImpl));
    expect((await integration.store(input)).reason).toBe("PERSISTENCE_DISABLED");
    expect((await integration.read("obs_1")).reason).toBe("PERSISTENCE_DISABLED");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("validates evidence before any network write", async () => {
    const fetchImpl = vi.fn();
    const integration = create({ ...config(fetchImpl), enabled: true });
    expect((await integration.store({ ...input, observationId: "bad/id" })).reason)
      .toBe("INVALID_EVIDENCE");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("round trips through injected test transport", async () => {
    const fetchImpl = vi.fn(async (_url, options) => ({
      ok: true, json: async () => options.method === "POST" ? [row] : [row]
    }));
    const integration = create({ ...config(fetchImpl), enabled: true });
    expect((await integration.store(input)).stored).toBe(true);
    const result = await integration.read("obs_1");
    expect(result.found).toBe(true);
    expect(result.snapshot.instanceId).toBe("instance-one");
    expect(fetchImpl.mock.calls.map(call => call[1].method)).toEqual(["POST", "GET"]);
    expect(integration.productionEligible).toBe(false);
  });
  it("fails closed on transport errors", async () => {
    const fetchImpl = vi.fn(async () => { throw Error("secret"); });
    const integration = create({ ...config(fetchImpl), enabled: true });
    const result = await integration.store(input);
    expect(result.stored).toBe(false);
    expect(JSON.stringify(result)).not.toContain("secret");
  });
});
