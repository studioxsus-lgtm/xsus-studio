import { describe, expect, it, vi } from "vitest";
import { createHyperWebArtifactCleanup } from "./hyper-web-artifact-cleanup.js";
const input = {
  userId: "11111111-1111-4111-8111-111111111111",
  projectId: "33333333-3333-4333-8333-333333333333",
  artifactId: "44444444-4444-4444-8444-444444444444"
};
const make = fetchImpl => createHyperWebArtifactCleanup({
  url: "https://example.supabase.co",
  serviceRoleKey: "test-server-key", fetchImpl
});
describe("XSUS App scoped build cleanup", () => {
  it("deletes only the three expected paths under the artifact prefix", async () => {
    const fetchImpl = vi.fn(async () => ({ status: 200 }));
    expect(await make(fetchImpl)(input)).toBe(true);
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://example.supabase.co/storage/v1/object/xsus-app-builds");
    expect(options.method).toBe("DELETE");
    const prefix = [input.userId, input.projectId, input.artifactId].join("/");
    expect(JSON.parse(options.body).prefixes).toEqual([
      prefix + "/index.html", prefix + "/styles.css", prefix + "/app.js"
    ]);
  });
  it("rejects invalid scope before making a request", async () => {
    const fetchImpl = vi.fn();
    expect(await make(fetchImpl)({ ...input, artifactId: "../bad" })).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("does not report cleanup success on failure", async () => {
    expect(await make(async () => ({ status: 403 }))(input)).toBe(false);
    expect(await make(async () => { throw Error("offline"); })(input)).toBe(false);
  });
});
