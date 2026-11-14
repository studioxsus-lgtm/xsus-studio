/**
 * Hyper v8.2.30 — controlled XSUS App <-> Hyper Core boundary.
 * Server-side adapter only; never exports credentials, evidence or MAC keys.
 * Not a public route, not a deployment and not production authorization.
 */
export const HYPER_APP_BRIDGE_VERSION = "8.2.30";
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const ACTIONS = Object.freeze(["evidence.store", "evidence.verify"]);

export function createHyperAppIntegrationBridge({
  storage, authorize, enabled = false
} = {}) {
  if (!storage || typeof storage.store !== "function" ||
      typeof storage.readVerified !== "function" ||
      typeof authorize !== "function")
    throw new TypeError("Hyper App bridge dependencies invalid.");

  return Object.freeze({
    version: HYPER_APP_BRIDGE_VERSION,
    actions: ACTIONS,
    productionEligible: false,
    async execute(request, context) {
      if (enabled !== true)
        return Object.freeze({ ok: false, code: "BRIDGE_DISABLED" });
      if (!request || typeof request !== "object" ||
          !ACTIONS.includes(request.action))
        return Object.freeze({ ok: false, code: "INVALID_ACTION" });
      // Authorization is evaluated before invoking the storage boundary.
      let authorized = false;
      try { authorized = await authorize(context, request.action); }
      catch { authorized = false; }
      if (authorized !== true)
        return Object.freeze({ ok: false, code: "ACCESS_DENIED" });

      try {
        if (request.action === "evidence.store") {
          // Only trusted server handlers should be allowed to call this action.
          const result = await storage.store(request.input);
          return Object.freeze(result?.stored === true
            ? { ok: true, action: request.action, observationId: result.observationId }
            : { ok: false, code: "STORE_FAILED" });
        }
        if (typeof request.observationId !== "string" ||
            !ID.test(request.observationId))
          return Object.freeze({ ok: false, code: "INVALID_OBSERVATION_ID" });
        const result = await storage.readVerified(request.observationId);
        return Object.freeze(result?.verified === true
          ? { ok: true, action: request.action, observationId: request.observationId,
              verified: true, runtimeAttested: false, productionEligible: false }
          : { ok: false, code: "VERIFICATION_FAILED" });
      } catch {
        return Object.freeze({ ok: false, code: "BRIDGE_OPERATION_FAILED" });
      }
    }
  });
}
