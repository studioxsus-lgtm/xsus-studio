import { describe, expect, it, vi } from "vitest";
import { createHyperTrustedEvidenceStorage as create } from "./hyper-v8223-trusted-evidence-storage.js";

const key = Buffer.alloc(32, 3);
const input = () => ({
  observationId: "obs_1", serviceId: "srv_example",
  snapshot: {
    instanceId: "instance-one", processId: 101,
    startedAt: "2026-11-14T10:00:00Z",
    observedAt: "2026-11-14T10:01:00Z",
    source: "local-process-observation"
  }
});
const factory = (insertBundle, readBundle, enabled = true) =>
  create({ key, keyId: "key1", insertBundle, readBundle, enabled });

describe("Hyper v8.2.23 trusted evidence storage", () => {
  it("rejects missing atomic callbacks", () => {
    expect(() => create({ key, keyId: "key1" })).toThrow();
  });
  it("remains disabled by default", async () => {
    const insertBundle = vi.fn(), readBundle = vi.fn();
    const storage = create({ key, keyId: "key1", insertBundle, readBundle });
    expect((await storage.store(input())).reason).toBe("STORAGE_DISABLED");
    expect((await storage.readVerified("obs_1")).reason).toBe("STORAGE_DISABLED");
    expect(insertBundle).not.toHaveBeenCalled();
    expect(readBundle).not.toHaveBeenCalled();
  });
  it("verifies a stored atomic bundle", async () => {
    let bundle;
    const storage = factory(
      vi.fn(async value => {
        bundle = value;
        return { inserted: true, observationId: value.row.observation_id };
      }),
      vi.fn(async () => bundle)
    );
    expect((await storage.store(input())).stored).toBe(true);
    const result = await storage.readVerified("obs_1");
    expect(result.verified).toBe(true);
    expect(result.runtimeAttested).toBe(false);
    expect(result.productionEligible).toBe(false);
  });
  it("rejects tampered evidence", async () => {
    let bundle;
    const storage = factory(
      async value => {
        bundle = value;
        return { inserted: true, observationId: value.row.observation_id };
      },
      async () => ({
        ...bundle, row: { ...bundle.row, process_id: 202 }
      })
    );
    await storage.store(input());
    expect((await storage.readVerified("obs_1")).verified).toBe(false);
  });
  it("rejects mismatched observation identity", async () => {
    const storage = factory(
      async () => ({ inserted: false }),
      async () => ({ row: { observation_id: "other" }, envelope: {} })
    );
    expect((await storage.readVerified("obs_1")).verified).toBe(false);
  });
  it("fails closed on storage errors without leaking details", async () => {
    const storage = factory(
      async () => { throw Error("secret-db-error"); },
      async () => { throw Error("secret-db-error"); }
    );
    const a = await storage.store(input());
    const b = await storage.readVerified("obs_1");
    expect(a.stored).toBe(false);
    expect(b.verified).toBe(false);
    expect(JSON.stringify([a, b])).not.toContain("secret-db-error");
  });
});
