/**
 * Hyper XSUS Core server-side authorization boundary (portable reference).
 *
 * This module is NOT wired into Render. A server must inject trusted
 * Supabase verification and a project-ownership lookup backed by RLS.
 * Never trust userId, ownerId, or permissions supplied by a browser.
 */
import { createHyperApplicationRequest } from "./xsus-hyper-application-contract.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createHyperApplicationAuthorizationGate({
  verifyAccessToken, getProjectOwner, authorizeOperation
} = {}) {
  if (typeof verifyAccessToken !== "function" ||
      typeof getProjectOwner !== "function" ||
      typeof authorizeOperation !== "function")
    throw new TypeError("Trusted server authorization dependencies are required.");

  return Object.freeze({
    async authorize({ authorization, body } = {}) {
      if (typeof authorization !== "string" ||
          !/^Bearer [A-Za-z0-9_.-]{16,8192}$/.test(authorization))
        throw new Error("Unauthorized Hyper application request.");
      // Validate the request before any ownership lookup or execution.
      const request = createHyperApplicationRequest(body);
      const token = authorization.slice(7);
      let identity;
      try {
        identity = await verifyAccessToken(token);
      } catch {
        throw new Error("Unauthorized Hyper application request.");
      }
      const userId = identity?.id;
      if (typeof userId !== "string" || !UUID.test(userId))
        throw new Error("Unauthorized Hyper application request.");

      let ownerId;
      try {
        ownerId = await getProjectOwner(request.projectId, userId);
      } catch {
        throw new Error("Hyper project access denied.");
      }
      if (ownerId !== userId)
        throw new Error("Hyper project access denied.");

      let permitted;
      try {
        permitted = await authorizeOperation({
          userId, projectId: request.projectId, operation: request.operation
        });
      } catch {
        throw new Error("Hyper operation access denied.");
      }
      if (permitted !== true)
        throw new Error("Hyper operation access denied.");

      // Only server-derived identity is returned; never return the JWT.
      return Object.freeze({ userId, request });
    }
  });
}
