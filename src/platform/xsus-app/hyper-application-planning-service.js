/**
 * Server-only XSUS App Hyper plan composition.
 * The authorized dispatcher must verify JWT, project ownership and permission
 * before calling this executor. No public route or feature activation.
 */
import { createHyperApplicationDraftStore } from "./hyper-application-draft-store.js";
import { createHyperApplicationPlanExecutor } from "./hyper-application-plan-executor.js";

export function createHyperApplicationPlanningService({
  supabaseUrl, serviceRoleKey, fetchImpl, createRequestId
} = {}) {
  const saveDraft = createHyperApplicationDraftStore({
    url: supabaseUrl, serviceRoleKey, fetchImpl
  });
  const planApplication = createHyperApplicationPlanExecutor({
    saveDraft, ...(createRequestId ? { createRequestId } : {})
  });
  return Object.freeze({ planApplication });
}
