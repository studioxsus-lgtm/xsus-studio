import { describe, expect, it, vi } from "vitest";
import { createHyperSupabaseTransport as create } from "./hyper-v8218-supabase-transport.js";

const config = fetchImpl => ({
  url: "https://example.supabase.co", serviceRoleKey: "test-key", fetchImpl
});
const row = { observation_id: "obs_1", service_id: "srv_example" };

describe("Hyper v8.2.18 Supabase transport", () => {
  it("rejects unsafe URLs", () => {
    expect(() => create({ url: "http://example.com", serviceRoleKey: "x" })).toThrow();
  });
  it("makes no calls when disabled", async () => {
    const fetchImpl = vi.fn();
    const adapter = create(config(fetchImpl));
    await expect(adapter.insertRow(row)).rejects.toThrow("disabled");
    await expect(adapter.selectRow("obs_1")).rejects.toThrow("disabled");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("uses insert-only POST without upsert", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => [row] }));
    const adapter = create({ ...config(fetchImpl), enabled: true });
    expect((await adapter.insertRow(row)).inserted).toBe(true);
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toContain("/rest/v1/hyper_runtime_evidence");
    expect(options.method).toBe("POST");
    expect(options.headers.Prefer).toBe("return=representation");
    expect(options.headers.Authorization).toBe("Bearer test-key");
  });
  it("rejects unconfirmed inserts", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => [] }));
    await expect(create({ ...config(fetchImpl), enabled: true }).insertRow(row))
      .rejects.toThrow("write failed");
  });
  it("uses GET and checks unique identity", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => [row] }));
    const result = await create({ ...config(fetchImpl), enabled: true }).selectRow("obs_1");
    expect(result.observation_id).toBe("obs_1");
    expect(fetchImpl.mock.calls[0][1].method).toBe("GET");
  });
  it("rejects multiple rows", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => [row, row] }));
    await expect(create({ ...config(fetchImpl), enabled: true }).selectRow("obs_1"))
      .rejects.toThrow("read failed");
  });
});
