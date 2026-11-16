/**
 * Hyper application operation dispatcher — reference server composition only.
 *
 * NOT wired to Render. No default executor, endpoint or database access.
 * All authorization checks must finish before an operation is invoked.
 */
import { createHyperApplicationAuthorizationGate } from "./xsus-hyper-application-authorization.js";
import { parseHyperApplicationResponse } from "./xsus-hyper-application-contract.js";

export function createHyperApplicationDispatcher({
  verifyAccessToken, getProjectOwner, authorizeOperation,
  planApplication, buildApplication
} = {}) {
  if (typeof planApplication !== "function" || typeof buildApplication !== "function")
    throw new TypeError("Explicit Hyper application executors are required.");
  const gate = createHyperApplicationAuthorizationGate({
    verifyAccessToken, getProjectOwner, authorizeOperation
  });

  return Object.freeze({
    async dispatch({ authorization, body } = {}) {
      const { userId, request } = await gate.authorize({ authorization, body });
      const executor = request.operation === "application.plan"
        ? planApplication : buildApplication;
      // The executor receives the verified user identity, never a JWT.
      const result = await executor(Object.freeze({
        userId, projectId: request.projectId, prompt: request.prompt,
        contractVersion: request.contractVersion
      }));
      return parseHyperApplicationResponse(result, {
        operation: request.operation,
        projectId: request.projectId
      });
    }
  });
}
