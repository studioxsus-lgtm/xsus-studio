/**
 * Strict XSUS App web build composition: upload + authenticated readback.
 * No public endpoint. Must be called only by an authorized Hyper dispatcher.
 */
import { createHyperWebBuildExecutor } from "./hyper-web-build-executor.js";
import { createHyperWebArtifactStore } from "./hyper-web-artifact-store.js";
import { createHyperWebArtifactVerifier } from "./hyper-web-artifact-verifier.js";

export function createVerifiedHyperWebBuildService({
  supabaseUrl, serviceRoleKey, fetchImpl, createArtifactId, createRequestId
} = {}) {
  const upload = createHyperWebArtifactStore({
    url: supabaseUrl, serviceRoleKey, fetchImpl
  });
  const verify = createHyperWebArtifactVerifier({
    url: supabaseUrl, serviceRoleKey, fetchImpl
  });
  const saveArtifact = async context => {
    if (await upload(context) !== true) return false;
    return await verify(context) === true;
  };
  const buildApplication = createHyperWebBuildExecutor({
    saveArtifact,
    ...(createArtifactId ? { createArtifactId } : {}),
    ...(createRequestId ? { createRequestId } : {})
  });
  return Object.freeze({ buildApplication });
}
