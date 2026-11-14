import { describe, expect, it, vi } from "vitest";
import { createHyperAtomicBundleTransport as create } from "./hyper-v8225-atomic-bundle-transport.js";
const row = {
  observation_id: "obs_1", service_id: "srv_example",
  instance_id: "instance-one", process_id: 101,
  started_at: "2026-11-14T10:00:00Z",
  observed_at: "2026-11-14T10:01:00Z",
  source: "local-process-observation",
  envelope_version: 1, envelope_algorithm: "HMAC-SHA256",
  envelope_key_id: "key1", evidence_digest: "a".repeat(64),
  authentication_tag: "b".repeat(64)
};
const bundle = () => ({
  row: Object.fromEntries(Object.entries(row).filter(([k]) => !k.startsWith("envelope_") &&
    k !== "evidence_digest" && k !== "authentication_tag")),
  envelope: {
    version: 1, algorithm: "HMAC-SHA256", keyId: "key1",
    evidenceDigest: "a".repeat(64), authenticationTag: "b".repeat(64)
  }
});
const config = fetchImpl => ({
  url: "https://example.supabase.co", serviceRoleKey: "test-only-key", fetchImpl
});
describe("Hyper v8.2.25 atomic bundle transport", () => {
  it("rejects non-Supabase URLs", () => {
    expect(() => create({ ...config(vi.fn()), url: "https://example.org" })).toThrow();
  });
  it("rejects URLs containing credentials or query strings", () => {
    expect(() => create({ ...config(vi.fn()), url: "https://user:pass@example.supabase.co" })).toThrow();
    expect(() => create({ ...config(vi.fn()), url: "https://example.supabase.co/?x=1" })).toThrow();
  });
  it("does not call network when disabled", async () => {
    const fetchImpl = vi.fn();
    const adapter = create(config(fetchImpl));
    await expect(adapter.insertBundle(bundle())).rejects.toThrow("disabled");
    await expect(adapter.readBundle("obs_1")).rejects.toThrow("disabled");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("uses one POST and confirms the returned row", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => [row] }));
    const adapter = create({ ...config(fetchImpl), enabled: true });
    expect((await adapter.insertBundle(bundle())).inserted).toBe(true);
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toContain("hyper_runtime_evidence_bundles");
    expect(options.method).toBe("POST");
    expect(options.headers.Prefer).toBe("return=representation");
    expect(options.redirect).toBe("error");
  });
  it("uses GET and validates the returned bundle", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => [row] }));
    const adapter = create({ ...config(fetchImpl), enabled: true });
    expect((await adapter.readBundle("obs_1")).envelope.authenticationTag).toBe("b".repeat(64));
    expect(fetchImpl.mock.calls[0][1].method).toBe("GET");
  });
  it("rejects duplicate rows and mismatched writes", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => [row, row] }));
    const adapter = create({ ...config(fetchImpl), enabled: true });
    await expect(adapter.readBundle("obs_1")).rejects.toThrow("read failed");
    await expect(adapter.insertBundle(bundle())).rejects.toThrow("write failed");
  });
  it("does not leak provider error details", async () => {
    const fetchImpl = vi.fn(async () => { throw Error("secret-provider-message"); });
    const adapter = create({ ...config(fetchImpl), enabled: true });
    await expect(adapter.insertBundle(bundle())).rejects.not.toThrow("secret-provider-message");
  });
});
