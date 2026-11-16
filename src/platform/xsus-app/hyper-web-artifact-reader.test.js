import { describe, expect, it, vi } from "vitest";
import { createHyperWebArtifactReader } from "./hyper-web-artifact-reader.js";
const input = {
  userId: "11111111-1111-4111-8111-111111111111",
  projectId: "33333333-3333-4333-8333-333333333333",
  artifactId: "44444444-4444-4444-8444-444444444444"
};
const names = ["index.html", "styles.css", "app.js"];
const texts = ["<!doctype html>", "body{}", "console.log(1)"];
const response = (value, status = 200) => ({
  status,
  headers: { get: () => null },
  arrayBuffer: async () => new TextEncoder().encode(value).buffer
});
const make = fetchImpl => createHyperWebArtifactReader({
  url: "https://example.supabase.co",
  serviceRoleKey: "test-server-key", fetchImpl
});
describe("XSUS App private artifact reader", () => {
  it("reads exactly three scoped files without public links", async () => {
    const fetchImpl = vi.fn(async url =>
      response(texts[names.findIndex(n => url.endsWith("/" + n))]));
    const result = await make(fetchImpl)(input);
    expect(result.files.map(f => f.path)).toEqual(names);
    expect(result.files.map(f => f.content)).toEqual(texts);
    expect(result).not.toHaveProperty("url");
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    for (const [url, options] of fetchImpl.mock.calls) {
      expect(url).toContain("/storage/v1/object/authenticated/xsus-app-builds/");
      expect(url).toContain([input.userId, input.projectId, input.artifactId].join("/"));
      expect(options.method).toBe("GET");
      expect(options.headers.Authorization).toBe("Bearer test-server-key");
    }
  });
  it("rejects invalid IDs without network access", async () => {
    const fetchImpl = vi.fn();
    expect(await make(fetchImpl)({ ...input, artifactId: "../other" })).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("fails closed on missing objects and network failures", async () => {
    expect(await make(async () => ({ status: 404 }))(input)).toBeNull();
    expect(await make(async () => { throw Error("offline"); })(input)).toBeNull();
  });
  it("rejects oversized content and invalid UTF-8", async () => {
    const oversized = async () => ({
      status: 200,
      headers: { get: () => "500000" },
      arrayBuffer: async () => new ArrayBuffer(0)
    });
    expect(await make(oversized)(input)).toBeNull();
    const invalid = async () => ({
      status: 200,
      headers: { get: () => null },
      arrayBuffer: async () => Uint8Array.from([255, 254]).buffer
    });
    expect(await make(invalid)(input)).toBeNull();
  });
  it("does not return partial files", async () => {
    let calls = 0;
    const fetchImpl = async () => ++calls === 2
      ? { status: 403 } : response(texts[0]);
    expect(await make(fetchImpl)(input)).toBeNull();
    expect(calls).toBe(2);
  });
});
