import { describe, expect, it, vi } from "vitest";
import { createHyperProjectOwnerReader } from "./hyper-project-owner-reader.js";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const P = "33333333-3333-4333-8333-333333333333";
const url = "https://xsus-example.supabase.co";
const serviceRoleKey = "server-only-key";
const response = (rows, ok = true) => ({ ok, json: async () => rows });

describe("Hyper project ownership — server-only, fail closed", () => {
  it("returns owner only for exact matching project and verified user", async () => {
    const fetchImpl = vi.fn(async () => response([{ id: P, owner_id: A }]));
    const lookup = createHyperProjectOwnerReader({ url, serviceRoleKey, fetchImpl });
    expect(await lookup(P, A)).toBe(A);
    const [endpoint, options] = fetchImpl.mock.calls[0];
    expect(endpoint).toContain("/rest/v1/xsus_app_projects?");
    expect(endpoint).toContain("id=eq." + P);
    expect(options.headers.Authorization).toBe("Bearer " + serviceRoleKey);
    expect(options.redirect).toBe("error");
    expect(JSON.stringify(options)).not.toContain(A);
  });

  it.each([
    ["other owner", [{ id: P, owner_id: B }]],
    ["other project", [{ id: A, owner_id: A }]],
    ["missing project", []],
    ["duplicate rows", [{ id: P, owner_id: A }, { id: P, owner_id: A }]],
    ["malformed rows", {}]
  ])("denies %s", async (_, rows) => {
    const lookup = createHyperProjectOwnerReader({
      url, serviceRoleKey, fetchImpl: async () => response(rows)
    });
    expect(await lookup(P, A)).toBeNull();
  });

  it("denies backend HTTP errors and transport failures", async () => {
    const failed = createHyperProjectOwnerReader({
      url, serviceRoleKey, fetchImpl: async () => response([], false)
    });
    expect(await failed(P, A)).toBeNull();
    const thrown = createHyperProjectOwnerReader({
      url, serviceRoleKey, fetchImpl: async () => { throw new Error("secret"); }
    });
    expect(await thrown(P, A)).toBeNull();
  });

  it("rejects malformed identities before any network call", async () => {
    const fetchImpl = vi.fn();
    const lookup = createHyperProjectOwnerReader({ url, serviceRoleKey, fetchImpl });
    expect(await lookup("invalid", A)).toBeNull();
    expect(await lookup(P, "invalid")).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects unsafe configuration", () => {
    expect(() => createHyperProjectOwnerReader({
      url: "http://xsus-example.supabase.co", serviceRoleKey
    })).toThrow();
    expect(() => createHyperProjectOwnerReader({
      url: "https://evil.example", serviceRoleKey
    })).toThrow();
    expect(() => createHyperProjectOwnerReader({
      url, serviceRoleKey: ""
    })).toThrow();
  });
});
