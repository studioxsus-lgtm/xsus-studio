import { describe, expect, it, vi } from "vitest";
import { createHyperWebArtifactStore } from "./hyper-web-artifact-store.js";
const userId = "11111111-1111-4111-8111-111111111111";
const projectId = "33333333-3333-4333-8333-333333333333";
const artifactId = "44444444-4444-4444-8444-444444444444";
const files = [
  { path: "index.html", content: "<!doctype html><title>XSUS</title>" },
  { path: "styles.css", content: "body{margin:0}" },
  { path: "app.js", content: "console.log('xsus')" }
];
const input = { userId, projectId, artifactId, requestId: "build_1",
  platform: "web", format: "static-web-files", files };
const make = fetchImpl => createHyperWebArtifactStore({
  url: "https://xsus-example.supabase.co", serviceRoleKey: "secret", fetchImpl
});
describe("XSUS App private static artifact store", () => {
  it("uploads exactly three files to owner/project/artifact-scoped paths", async () => {
    const fetchImpl = vi.fn(async () => ({ status: 200 }));
    expect(await make(fetchImpl)(input)).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    for (const [i, [url, options]] of fetchImpl.mock.calls.entries()) {
      expect(url).toContain(
        "/storage/v1/object/xsus-app-builds/" +
        [userId, projectId, artifactId, files[i].path].join("/")
      );
      expect(options.headers["x-upsert"]).toBe("false");
      expect(options.headers.Authorization).toBe("Bearer secret");
    }
  });
  it("returns false and attempts cleanup on partial upload", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({ status: 201 })
      .mockResolvedValueOnce({ status: 403 })
      .mockResolvedValueOnce({ status: 200 });
    expect(await make(fetchImpl)(input)).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl.mock.calls[2][1].method).toBe("DELETE");
    expect(JSON.parse(fetchImpl.mock.calls[2][1].body).prefixes)
      .toHaveLength(1);
  });
  it("fails closed on transport errors", async () => {
    expect(await make(async () => { throw Error("offline"); })(input)).toBe(false);
  });
  it("rejects malformed or extra files without network access", async () => {
    const fetchImpl = vi.fn();
    const save = make(fetchImpl);
    expect(await save({ ...input, userId: "bad" })).toBe(false);
    expect(await save({ ...input, files: [...files, { path: "evil", content: "x" }] })).toBe(false);
    expect(await save({ ...input, files: [files[0], files[0], files[2]] })).toBe(false);
    expect(await save({ ...input, requestId: "../x" })).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("rejects non-Supabase endpoints and arbitrary buckets", () => {
    expect(() => createHyperWebArtifactStore({
      url: "https://evil.test", serviceRoleKey: "secret"
    })).toThrow(TypeError);
    expect(() => createHyperWebArtifactStore({
      url: "https://xsus-example.supabase.co", serviceRoleKey: "secret",
      bucket: "public"
    })).toThrow(TypeError);
  });
});
