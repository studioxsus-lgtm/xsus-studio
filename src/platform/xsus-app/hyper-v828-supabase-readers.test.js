import { describe, expect, it, vi } from "vitest";
import { createHyperSupabaseReader as create } from "./hyper-v828-supabase-readers.js";

const config = (fetchImpl) => ({
  url: "https://audit-example.supabase.co",
  serviceRoleKey: "server-only-secret",
  table: "hyper_audit",
  recordId: "record_1",
  fetchImpl
});

describe("Hyper v8.2.8 Supabase read-only reader", () => {
  it("makes a GET with server-only credentials", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => [{ id: "record_1", digest: "sha256-digest" }]
    }));
    expect(await create(config(fetchImpl)).read()).toEqual({
      recordId: "record_1", digest: "sha256-digest"
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toContain("/rest/v1/hyper_audit?");
    expect(options.method).toBe("GET");
    expect(options.headers.apikey).toBe("server-only-secret");
  });

  it("rejects unsafe table identifiers", () => {
    expect(() => create({ ...config(vi.fn()), table: "hyper_audit;drop table" }))
      .toThrow("configuration is invalid");
  });

  it("rejects non-HTTPS URLs", () => {
    expect(() => create({ ...config(vi.fn()), url: "http://localhost" }))
      .toThrow("configuration is invalid");
  });

  it("fails closed for missing records", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => [] }));
    await expect(create(config(fetchImpl)).read()).rejects.toThrow("read verification failed");
  });

  it("fails closed for duplicate records", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => [
        { id: "record_1", digest: "a" },
        { id: "record_1", digest: "a" }
      ]
    }));
    await expect(create(config(fetchImpl)).read()).rejects.toThrow("read verification failed");
  });

  it("does not expose credentials in errors", async () => {
    const fetchImpl = vi.fn(async () => { throw Error("server-only-secret"); });
    await expect(create(config(fetchImpl)).read()).rejects.not.toThrow("server-only-secret");
  });
});
