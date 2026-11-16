import { describe, expect, it, vi } from "vitest";
import { createGuardedHyperApplicationService } from "./hyper-guarded-application-service.js";
const readiness = {
  authVerified: true, projectSchemaVerified: true, projectRlsVerified: true,
  projectOwnershipVerified: true, operationAuthorizationVerified: true,
  planExecutorVerified: true, buildExecutorVerified: true, endToEndVerified: true
};
const config = {
  supabaseUrl: "https://example.supabase.co",
  publishableKey: "test-publishable",
  serviceRoleKey: "test-server-key",
  authorizeOperation: async () => true,
  fetchImpl: vi.fn()
};
describe("XSUS App guarded Hyper operations", () => {
  it("is disabled by default", async () => {
    const service = createGuardedHyperApplicationService(config);
    expect(service.enabled).toBe(false);
    expect(service.productionEligible).toBe(false);
    expect((await service.handle({ method: "POST" })).status).toBe(503);
    expect(config.fetchImpl).not.toHaveBeenCalled();
  });
  it("fails closed when one production check is missing", async () => {
    const service = createGuardedHyperApplicationService({
      ...config, enabled: true,
      readiness: { ...readiness, projectRlsVerified: false }
    });
    expect(service.enabled).toBe(false);
    expect(service.blockers).toContain("projectRlsVerified");
    expect((await service.handle({ method: "POST" })).status).toBe(503);
  });
  it("still requires explicit activation with all checks true", async () => {
    const service = createGuardedHyperApplicationService({
      ...config, readiness
    });
    expect(service.productionEligible).toBe(true);
    expect(service.enabled).toBe(false);
  });
  it("rejects unauthenticated execution when explicitly enabled", async () => {
    const service = createGuardedHyperApplicationService({
      ...config, readiness, enabled: true
    });
    expect(service.enabled).toBe(true);
    expect((await service.handle({ method: "POST", headers: {},
      body: "{}" })).status).toBe(401);
    expect(config.fetchImpl).not.toHaveBeenCalled();
  });
});
