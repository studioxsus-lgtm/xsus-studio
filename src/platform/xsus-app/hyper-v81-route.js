/**
 * Hyper v8.2.4 — isolated HTTP boundary, disabled until live verification.
 * No storage access, no secret output, no bypass for environment flags.
 */
import { inspectHyperV81ActivationGate } from "./hyper-v81-activation-gate.js";

export function createHyperV81Route({ env = {}, verifyUser, handleAssurance } = {}) {
  const gate = inspectHyperV81ActivationGate(env);
  return Object.freeze({
    async handle({ method = "GET", authorization } = {}) {
      if (method !== "GET") return { status: 405, data: { error: "Method not allowed." } };
      // Never authenticate or access storage while the activation gate is closed.
      if (!gate.activationAllowed) return {
        status: 503,
        data: { error: "Hyper v8.1 integration is not activated." }
      };
      if (typeof authorization !== "string" || !/^Bearer\\s+\\S+$/i.test(authorization))
        return { status: 401, data: { error: "Authentication required." } };
      if (typeof verifyUser !== "function" || typeof handleAssurance !== "function")
        return { status: 503, data: { error: "Hyper integration unavailable." } };
      try {
        const user = await verifyUser(authorization);
        if (!user || typeof user.userId !== "string" || !user.userId.trim())
          return { status: 403, data: { error: "Access denied." } };
        return await handleAssurance({ userId: user.userId });
      } catch {
        return { status: 503, data: { error: "Hyper integration unavailable." } };
      }
    }
  });
}
