/**
 * Authorized private artifact retrieval for XSUS App.
 * Server-only; not mounted as an HTTP endpoint.
 * The caller must supply a bearer token, never a userId.
 */
import { createHyperSupabaseAuthVerifier } from "./hyper-v8233-supabase-auth-verifier.js";
import { createHyperProjectOwnerReader } from "./hyper-project-owner-reader.js";
import { createHyperWebArtifactReader } from "./hyper-web-artifact-reader.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createAuthorizedHyperArtifactReader({
  supabaseUrl, publishableKey, serviceRoleKey, fetchImpl,
  authorizeRead, enabled = false
} = {}) {
  if (typeof authorizeRead !== "function")
    throw new TypeError("Trusted artifact read authorization is required.");
  const active = enabled === true;
  const auth = createHyperSupabaseAuthVerifier({
    url: supabaseUrl, apiKey: publishableKey, fetchImpl, enabled: active
  });
  const getProjectOwner = createHyperProjectOwnerReader({
    url: supabaseUrl, serviceRoleKey, fetchImpl
  });
  const read = createHyperWebArtifactReader({
    url: supabaseUrl, serviceRoleKey, fetchImpl
  });
  return Object.freeze({
    enabled: active,
    async read({ authorization, projectId, artifactId } = {}) {
      if (!active || typeof authorization !== "string" ||
          !/^Bearer [A-Za-z0-9_.-]{16,4096}$/.test(authorization) ||
          typeof projectId !== "string" || !UUID.test(projectId) ||
          typeof artifactId !== "string" || !UUID.test(artifactId))
        return null;
      try {
        const verified = await auth.verifyBearerToken(authorization.slice(7));
        if (verified?.verified !== true) return null;
        const userId = verified.userId;
        if (await getProjectOwner(projectId, userId) !== userId) return null;
        if (await authorizeRead({
          userId, projectId, artifactId, operation: "application.read"
        }) !== true) return null;
        return await read({ userId, projectId, artifactId });
      } catch {
        return null;
      }
    }
  });
}
