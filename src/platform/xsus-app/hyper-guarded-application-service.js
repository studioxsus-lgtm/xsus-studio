/**
 * XSUS App -> Hyper operations, guarded server-only composition.
 *
 * Composes real architecture draft persistence and verified static web builds
 * with the existing JWT/owner/permission gate. No HTTP route is mounted.
 * Fail closed unless all production readiness checks are explicitly verified.
 */
import { assessHyperApplicationReadiness } from "./hyper-application-readiness.js";
import { createHyperApplicationPlanningService } from "./hyper-application-planning-service.js";
import { createVerifiedHyperWebBuildService } from "./hyper-verified-web-build-service.js";
import { createHyperApplicationBackendComposition } from "./hyper-application-backend-composition.js";

export function createGuardedHyperApplicationService({
  supabaseUrl, publishableKey, serviceRoleKey, fetchImpl,
  authorizeOperation, readiness = {}, enabled = false,
  createPlanRequestId, createBuildRequestId, createArtifactId
} = {}) {
  if (typeof authorizeOperation !== "function")
    throw new TypeError("Trusted operation authorization is required.");
  const assessment = assessHyperApplicationReadiness(readiness);
  const active = enabled === true && assessment.productionEligible === true;
  const planner = createHyperApplicationPlanningService({
    supabaseUrl, serviceRoleKey, fetchImpl,
    ...(createPlanRequestId ? { createRequestId: createPlanRequestId } : {})
  });
  const builder = createVerifiedHyperWebBuildService({
    supabaseUrl, serviceRoleKey, fetchImpl,
    ...(createBuildRequestId ? { createRequestId: createBuildRequestId } : {}),
    ...(createArtifactId ? { createArtifactId } : {})
  });
  const backend = createHyperApplicationBackendComposition({
    supabaseUrl, publishableKey, serviceRoleKey, fetchImpl,
    authorizeOperation,
    planApplication: planner.planApplication,
    buildApplication: builder.buildApplication,
    enabled: active
  });
  return Object.freeze({
    enabled: active,
    productionEligible: assessment.productionEligible,
    blockers: assessment.blockers,
    handle: backend.handle
  });
}
