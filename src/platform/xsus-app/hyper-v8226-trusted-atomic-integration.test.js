import { describe, expect, it, vi } from "vitest";
import { createHyperTrustedAtomicIntegration as create } from "./hyper-v8226-trusted-atomic-integration.js";
const config = fetchImpl => ({
  url: "https://example.supabase.co", serviceRoleKey: "test-key",
  key: Buffer.alloc(32, 4), keyId: "key1", fetchImpl
});
const input = () => ({
  observationId: "obs_1", serviceId: "srv_example",
  snapshot: {
    instanceId: "instance-one", processId: 101,
    startedAt: "2026-11-14T10:00:00Z",
    observedAt: "2026-11-14T10:01:00Z",
    source: "local-process-observation"
  }
});
describe("Hyper v8.2.26 trusted atomic integration", () => {
  it("is disabled by default", async () => {
    const fetchImpl = vi.fn();
    const integration = create(config(fetchImpl));
    expect((await integration.store(input())).reason).toBe("STORAGE_DISABLED");
    expect((await integration.readVerified("obs_1")).reason).toBe("STORAGE_DISABLED");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("round-trips a signed bundle via mocked REST", async () => {
    let stored;
    const fetchImpl = vi.fn(async (_url, opts) => {
      if (opts.method === "POST") stored = JSON.parse(opts.body);
      return { ok: true, json: async () => [stored] };
    });
    const integration = create({ ...config(fetchImpl), enabled: true });
    expect((await integration.store(input())).stored).toBe(true);
    const result = await integration.readVerified("obs_1");
    expect(result.verified).toBe(true);
    expect(result.runtimeAttested).toBe(false);
    expect(integration.productionEligible).toBe(false);
    expect(fetchImpl.mock.calls.map(c => c[1].method)).toEqual(["POST", "GET"]);
  });
  it("rejects altered stored records", async () => {
    let stored;
    const fetchImpl = vi.fn(async (_url, opts) => {
      if (opts.method === "POST") stored = JSON.parse(opts.body);
      return {
        ok: true,
        json: async () => [opts.method === "GET" ? { ...stored, process_id: 999 } : stored]
      };
    });
    const integration = create({ ...config(fetchImpl), enabled: true });
    expect((await integration.store(input())).stored).toBe(true);
    expect((await integration.readVerified("obs_1")).verified).toBe(false);
  });
  it("fails closed when REST returns an error", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 403 }));
    const integration = create({ ...config(fetchImpl), enabled: true });
    expect((await integration.store(input())).stored).toBe(false);
    expect((await integration.readVerified("obs_1")).verified).toBe(false);
  });
  it("rejects invalid evidence without REST calls", async () => {
    const fetchImpl = vi.fn();
    const integration = create({ ...config(fetchImpl), enabled: true });
    expect((await integration.store({ ...input(), observationId: "bad/id" })).stored).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
