import { describe, expect, it, vi } from "vitest";
import { createHyperV81Route } from "./hyper-v81-route.js";

describe("Hyper v8.2.4 disabled HTTP route", () => {
  it("returns 503 while activation is unverified", async () => {
    const route = createHyperV81Route();
    expect(await route.handle({ method: "GET" })).toEqual({
      status: 503,
      data: { error: "Hyper v8.1 integration is not activated." }
    });
  });

  it("rejects unsupported methods without touching dependencies", async () => {
    const verifyUser = vi.fn();
    const handleAssurance = vi.fn();
    const route = createHyperV81Route({ verifyUser, handleAssurance });
    expect((await route.handle({ method: "POST" })).status).toBe(405);
    expect(verifyUser).not.toHaveBeenCalled();
    expect(handleAssurance).not.toHaveBeenCalled();
  });

  it("never authenticates or accesses storage when disabled", async () => {
    const verifyUser = vi.fn();
    const handleAssurance = vi.fn();
    const route = createHyperV81Route({
      env: { XSUS_HYPER_V81_ENABLED: "true" },
      verifyUser,
      handleAssurance
    });
    expect((await route.handle({ authorization: "Bearer sample-token" })).status).toBe(503);
    expect(verifyUser).not.toHaveBeenCalled();
    expect(handleAssurance).not.toHaveBeenCalled();
  });

  it("never includes credentials in disabled responses", async () => {
    const route = createHyperV81Route({
      env: { SUPABASE_SERVICE_ROLE_KEY: "super-secret-value" }
    });
    expect(JSON.stringify(await route.handle())).not.toContain("super-secret-value");
  });
});
