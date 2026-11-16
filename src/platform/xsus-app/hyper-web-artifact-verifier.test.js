import { describe, expect, it, vi } from "vitest";
import { createHyperWebArtifactVerifier } from "./hyper-web-artifact-verifier.js";
const userId = "11111111-1111-4111-8111-111111111111";
const projectId = "33333333-3333-4333-8333-333333333333";
const artifactId = "44444444-4444-4444-8444-444444444444";
const files = [
  { path: "index.html", content: "<!doctype html>" },
  { path: "styles.css", content: "body{color:red}" },
  { path: "app.js", content: "console.log('ok')" }
];
const input = { userId, projectId, artifactId, files };
const response = content => ({
  status: 200, arrayBuffer: async () => new TextEncoder().encode(content).buffer
});
const make = fetchImpl => createHyperWebArtifactVerifier({
  url: "https://xsus-example.supabase.co",
  serviceRoleKey: "server-secret", fetchImpl
});
describe("XSUS App build artifact authenticated readback", () => {
  it("confirms every file has exactly matching bytes", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(files[0].content))
      .mockResolvedValueOnce(response(files[1].content))
      .mockResolvedValueOnce(response(files[2].content));
    expect(await make(fetchImpl)(input)).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    for (const [i, [url, opts]] of fetchImpl.mock.calls.entries()) {
      expect(url).toContain("/storage/v1/object/authenticated/xsus-app-builds/");
      expect(url).toContain([userId, projectId, artifactId, files[i].path].join("/"));
      expect(opts.headers.Authorization).toBe("Bearer server-secret");
      expect(opts.method).toBe("GET");
    }
  });
  it("rejects content tampering", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(files[0].content))
      .mockResolvedValueOnce(response("different"));
    expect(await make(fetchImpl)(input)).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it("rejects missing objects and network errors", async () => {
    expect(await make(async () => ({ status: 404 }))(input)).toBe(false);
    expect(await make(async () => { throw Error("offline"); })(input)).toBe(false);
  });
  it("rejects invalid identifiers and paths before fetching", async () => {
    const fetchImpl = vi.fn();
    const verify = make(fetchImpl);
    expect(await verify({ ...input, userId: "bad" })).toBe(false);
    expect(await verify({ ...input, files: [
      { path: "../index.html", content: "x" }, ...files.slice(1)
    ] })).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("rejects untrusted endpoints", () => {
    expect(() => createHyperWebArtifactVerifier({
      url: "https://evil.example", serviceRoleKey: "server-secret"
    })).toThrow(TypeError);
  });
});
