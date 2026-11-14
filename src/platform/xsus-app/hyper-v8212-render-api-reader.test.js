import { describe, expect, it, vi } from "vitest";
import { createHyperRenderApiReader as create } from "./hyper-v8212-render-api-reader.js";

const fixture = () => [
  { deploy: { id: "dep-new123", status: "live", finishedAt: "2026-11-14T10:02:00Z" } },
  { deploy: { id: "dep-old123", status: "deactivated", finishedAt: "2026-11-14T10:00:00Z" } }
];
const make = fetchImpl => create({ apiKey: "test-api-key", serviceId: "srv-test123", fetchImpl });

describe("Hyper v8.2.12 Render read-only API", () => {
  it("uses authenticated GET only", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => fixture() }));
    const result = await make(fetchImpl).readDeploymentEvent();
    expect(result.eventKind).toBe("deployment-transition");
    expect(result.currentDeploymentId).toBe("dep-new123");
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.render.com/v1/services/srv-test123/deploys?limit=20");
    expect(options.method).toBe("GET");
    expect(options.headers.Authorization).toBe("Bearer test-api-key");
  });
  it("rejects malformed service identifiers", () => {
    expect(() => create({ apiKey: "x", serviceId: "../other" })).toThrow();
  });
  it("rejects insufficient deployment history", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => fixture().slice(0, 1) }));
    await expect(make(fetchImpl).readDeploymentEvent()).rejects.toThrow("verification failed");
  });
  it("rejects non-live latest deployment", async () => {
    const fetchImpl = vi.fn(async () => {
      const rows = fixture(); rows[0].deploy.status = "build_failed";
      return { ok: true, json: async () => rows };
    });
    await expect(make(fetchImpl).readDeploymentEvent()).rejects.toThrow("verification failed");
  });
  it("sanitizes API failures", async () => {
    const fetchImpl = vi.fn(async () => { throw Error("test-api-key"); });
    await expect(make(fetchImpl).readDeploymentEvent()).rejects.not.toThrow("test-api-key");
  });
});
