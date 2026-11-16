import { describe, expect, it, vi } from "vitest";
import { createVerifiedHyperWebBuildService } from "./hyper-verified-web-build-service.js";
const userId = "11111111-1111-4111-8111-111111111111";
const projectId = "33333333-3333-4333-8333-333333333333";
const artifactId = "44444444-4444-4444-8444-444444444444";
const input = { userId, projectId, prompt: "Task tracker", contractVersion: "1.0.0" };
const make = fetchImpl => createVerifiedHyperWebBuildService({
  supabaseUrl: "https://xsus-example.supabase.co", serviceRoleKey: "secret",
  fetchImpl, createArtifactId: () => artifactId,
  createRequestId: () => "build_1"
});
describe("XSUS App verified web build integration", () => {
  it("only reports completed after three uploads and three matching readbacks", async () => {
    const uploaded = [];
    const fetchImpl = vi.fn(async (url, opts) => {
      if (opts.method === "POST") {
        uploaded.push(opts.body);
        return { status: 201 };
      }
      const index = ["index.html", "styles.css", "app.js"]
        .findIndex(name => url.endsWith("/" + name));
      return {
        status: 200,
        arrayBuffer: async () => new TextEncoder().encode(uploaded[index]).buffer
      };
    });
    const result = await make(fetchImpl).buildApplication(input);
    expect(result).toMatchObject({ ok: true, status: "completed",
      artifactId, operation: "application.build" });
    expect(fetchImpl.mock.calls.map(([, opts]) => opts.method))
      .toEqual(["POST", "POST", "POST", "GET", "GET", "GET"]);
  });
  it("fails if readback differs even after successful uploads", async () => {
    const fetchImpl = vi.fn(async (_url, opts) =>
      opts.method === "POST" ? { status: 201 } : {
        status: 200,
        arrayBuffer: async () => new TextEncoder().encode("tampered").buffer
      });
    await expect(make(fetchImpl).buildApplication(input))
      .rejects.toThrow("persistence failed");
    expect(fetchImpl).toHaveBeenCalledTimes(5);
    expect(fetchImpl.mock.calls[4][1].method).toBe("DELETE");
  });
  it("does not read back if an upload fails", async () => {
    const fetchImpl = vi.fn(async () => ({ status: 403 }));
    await expect(make(fetchImpl).buildApplication(input))
      .rejects.toThrow("persistence failed");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
