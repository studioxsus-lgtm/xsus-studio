/**
 * Hyper v8.2.31 — XSUS App backend-only request handler.
 * Framework-neutral; no HTTP route or production deployment is registered.
 * Caller MUST supply server-verified identity and an authorization callback.
 * Never trust a userId/role supplied in request body.
 */
export const HYPER_APP_BACKEND_VERSION = "8.2.31";
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

export function createHyperAppBackendHandler({
  bridge, authorizeUser, enabled = false
} = {}) {
  if (!bridge || typeof bridge.execute !== "function" ||
      typeof authorizeUser !== "function")
    throw new TypeError("Hyper backend dependencies invalid.");
  return Object.freeze({
    version: HYPER_APP_BACKEND_VERSION,
    productionEligible: false,
    async handle({ principal, body } = {}) {
      if (enabled !== true) return Object.freeze({ status: 503, body: { ok: false, code: "BACKEND_DISABLED" } });
      if (!principal || principal.verified !== true ||
          typeof principal.userId !== "string" || !ID.test(principal.userId))
        return Object.freeze({ status: 401, body: { ok: false, code: "UNAUTHENTICATED" } });
      if (!body || typeof body !== "object" || Array.isArray(body) ||
          !own(body, "action") || body.action !== "evidence.verify" ||
          typeof body.observationId !== "string" || !ID.test(body.observationId))
        return Object.freeze({ status: 400, body: { ok: false, code: "INVALID_REQUEST" } });
      // This handler deliberately exposes only evidence.verify. Store is a
      // privileged internal operation, never a client request action.
      let allowed = false;
      try {
        allowed = await authorizeUser({
          userId: principal.userId, action: "evidence.verify",
          observationId: body.observationId
        });
      } catch { allowed = false; }
      if (allowed !== true)
        return Object.freeze({ status: 403, body: { ok: false, code: "FORBIDDEN" } });
      try {
        const result = await bridge.execute(
          { action: "evidence.verify", observationId: body.observationId },
          Object.freeze({ verified: true, userId: principal.userId, source: "server-verified-principal" })
        );
        if (result?.ok !== true || result.verified !== true)
          return Object.freeze({ status: 503, body: { ok: false, code: "VERIFICATION_UNAVAILABLE" } });
        return Object.freeze({ status: 200, body: {
          ok: true, observationId: body.observationId, verified: true,
          runtimeAttested: false, productionEligible: false
        } });
      } catch {
        return Object.freeze({ status: 503, body: { ok: false, code: "VERIFICATION_UNAVAILABLE" } });
      }
    }
  });
}
