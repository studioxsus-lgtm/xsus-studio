/**
 * Server-only XSUS App static web build composition.
 * Dispatcher authorization is a mandatory upstream prerequisite.
 * Does not mount a route or create a public storage bucket.
 */
import { createHyperWebBuildExecutor } from "./hyper-web-build-executor.js";
import { createHyperWebArtifactStore } from "./hyper-web-artifact-store.js";

export function createHyperWebBuildService({
  supabaseUrl, serviceRoleKey, fetchImpl, createArtifactId, createRequestId
} = {}) {
  const saveArtifact = createHyperWebArtifactStore({
    url: supabaseUrl, serviceRoleKey, fetchImpl
  });
  const buildApplication = createHyperWebBuildExecutor({
    saveArtifact,
    ...(createArtifactId ? { createArtifactId } : {}),
    ...(createRequestId ? { createRequestId } : {})
  });
  return Object.freeze({ buildApplication });
}
