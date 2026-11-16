import { describe, expect, it, vi } from "vitest";
import { createHyperWebBuildExecutor } from "./hyper-web-build-executor.js";
const userId = "11111111-1111-4111-8111-111111111111";
const projectId = "33333333-3333-4333-8333-333333333333";
const artifactId = "44444444-4444-4444-8444-444444444444";
const input = { userId, projectId, contractVersion: "1.0.0",
  prompt: '<img src=x onerror=alert(1)> & test' };
const setup = saveArtifact => createHyperWebBuildExecutor({
  saveArtifact, createArtifactId: () => artifactId,
  createRequestId: () => "build_1"
});
describe("XSUS App real static web build", () => {
  it("generates runnable files and confirms durable save before success", async () => {
    const saveArtifact = vi.fn(async () => true);
    const result = await setup(saveArtifact)(input);
    expect(result).toMatchObject({ ok: true, status: "completed",
      operation: "application.build", projectId, artifactId });
    const payload = saveArtifact.mock.calls[0][0];
    expect(payload.userId).toBe(userId);
    expect(payload.platform).toBe("web");
    expect(payload.files.map(f => f.path)).toEqual(["index.html", "styles.css", "app.js"]);
    expect(payload.files[0].content).toContain("&lt;img");
    expect(payload.files[0].content).not.toContain("<img src=x");
    expect(payload.files[2].content).toContain("addEventListener");
    expect(payload.files[2].content).not.toContain('"<img');
  });
  it("fails closed when artifact persistence fails", async () => {
    await expect(setup(async () => false)(input)).rejects.toThrow("persistence failed");
    await expect(setup(async () => { throw Error("offline"); })(input)).rejects.toThrow("offline");
  });
  it("rejects malformed identity, prompt and contract before saving", async () => {
    const saveArtifact = vi.fn();
    const build = setup(saveArtifact);
    await expect(build({ ...input, userId: "bad" })).rejects.toThrow(TypeError);
    await expect(build({ ...input, prompt: "" })).rejects.toThrow(TypeError);
    await expect(build({ ...input, contractVersion: "9" })).rejects.toThrow(TypeError);
    expect(saveArtifact).not.toHaveBeenCalled();
  });
  it("requires trusted storage and valid artifact IDs", async () => {
    expect(() => createHyperWebBuildExecutor()).toThrow(TypeError);
    const build = createHyperWebBuildExecutor({
      saveArtifact: vi.fn(), createArtifactId: () => "bad",
      createRequestId: () => "build_1"
    });
    await expect(build(input)).rejects.toThrow("identifiers");
  });
});
