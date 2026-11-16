import { describe, expect, it, vi } from "vitest";
import { createHyperWebBuildService } from "./hyper-web-build-service.js";
const userId = "11111111-1111-4111-8111-111111111111";
const projectId = "33333333-3333-4333-8333-333333333333";
const artifactId = "44444444-4444-4444-8444-444444444444";
const input = { userId, projectId, prompt: "A useful task list", contractVersion: "1.0.0" };
const make = fetchImpl => createHyperWebBuildService({
  supabaseUrl: "https://xsus-example.supabase.co",
  serviceRoleKey: "secret", fetchImpl,
  createArtifactId: () => artifactId, createRequestId: () => "build_1"
});
describe("XSUS App web build -> private storage", () => {
  it("generates and stores three runnable files before completing", async () => {
    const fetchImpl = vi.fn(async () => ({ status: 201 }));
    const result = await make(fetchImpl).buildApplication(input);
    expect(result).toMatchObject({
      ok: true, status: "completed", operation: "application.build",
      artifactId, projectId
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl.mock.calls.map(([url]) => url.split("/").pop()))
      .toEqual(["index.html", "styles.css", "app.js"]);
    expect(fetchImpl.mock.calls[0][1].body).toContain("A useful task list");
  });
  it("does not claim a successful build if storage fails", async () => {
    const build = make(async () => ({ status: 503 })).buildApplication;
    await expect(build(input)).rejects.toThrow("persistence failed");
  });
  it("rejects malformed authorization context before any upload", async () => {
    const fetchImpl = vi.fn();
    const build = make(fetchImpl).buildApplication;
    await expect(build({ ...input, projectId: "bad" })).rejects.toThrow(TypeError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
