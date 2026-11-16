import { describe, expect, it } from "vitest";
import { assessHyperApplicationReadiness } from "./hyper-application-readiness.js";
const ALL = {
  authVerified: true, projectSchemaVerified: true, projectRlsVerified: true,
  projectOwnershipVerified: true, operationAuthorizationVerified: true,
  planExecutorVerified: true, buildExecutorVerified: true, endToEndVerified: true
};
describe("Hyper application production readiness", () => {
  it("is blocked by default", () => {
    const r = assessHyperApplicationReadiness();
    expect(r.productionEligible).toBe(false);
    expect(r.blockers).toHaveLength(8);
  });
  it.each(Object.keys(ALL))("blocks production when %s is not verified", key => {
    const r = assessHyperApplicationReadiness({ ...ALL, [key]: false });
    expect(r.productionEligible).toBe(false);
    expect(r.blockers).toEqual([key]);
  });
  it("does not treat truthy strings as verification", () => {
    expect(assessHyperApplicationReadiness({
      ...ALL, projectRlsVerified: "true"
    }).productionEligible).toBe(false);
  });
  it("reports eligible only when all eight checks are explicitly true", () => {
    const r = assessHyperApplicationReadiness(ALL);
    expect(r.productionEligible).toBe(true);
    expect(r.blockers).toEqual([]);
    expect(Object.isFrozen(r)).toBe(true);
    expect(Object.isFrozen(r.blockers)).toBe(true);
  });
});
