/**
 * Hyper v8.2.32 — framework-neutral authenticated HTTP boundary.
 * Not mounted to Express/Render; the caller must pass trusted server request
 * metadata and a verifier that validates bearer tokens against the auth provider.
 * No credentials are read from environment or sent to the client.
 */
export const HYPER_AUTH_API_VERSION = "8.2.32";
const MAX_BODY = 2048;
const BEARER = /^Bearer ([A-Za-z0-9._~-]{16,4096})$/;
const jsonHeaders = Object.freeze({
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff"
});
const reply = (status, body) => Object.freeze({
  status, headers: jsonHeaders, body: Object.freeze(body)
});
export function createHyperAuthenticatedApiAdapter({
  backendHandler, verifyBearerToken, enabled = false
} = {}) {
  if (!backendHandler || typeof backendHandler.handle !== "function" ||
      typeof verifyBearerToken !== "function")
    throw new TypeError("Hyper API adapter dependencies invalid.");
  return Object.freeze({
    version: HYPER_AUTH_API_VERSION,
    productionEligible: false,
    async handle(request = {}) {
      if (enabled !== true) return reply(503, {ok:false,code:"API_DISABLED"});
      if (request.method !== "POST")
        return reply(405, {ok:false,code:"METHOD_NOT_ALLOWED"});
      const type = request.headers?.["content-type"] ?? request.headers?.["Content-Type"];
      if (typeof type !== "string" ||
          !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(type))
        return reply(415, {ok:false,code:"UNSUPPORTED_MEDIA_TYPE"});
      const authorization = request.headers?.authorization ?? request.headers?.Authorization;
      if (typeof authorization !== "string" || !BEARER.test(authorization))
        return reply(401, {ok:false,code:"UNAUTHENTICATED"});
      if (typeof request.rawBody !== "string" ||
          Buffer.byteLength(request.rawBody, "utf8") > MAX_BODY)
        return reply(413, {ok:false,code:"INVALID_BODY_SIZE"});
      let body;
      try { body = JSON.parse(request.rawBody); }
      catch { return reply(400, {ok:false,code:"INVALID_JSON"}); }
      let principal;
      try {
        principal = await verifyBearerToken(authorization.slice(7));
      } catch {
        return reply(401, {ok:false,code:"UNAUTHENTICATED"});
      }
      // Verified identity is constructed only from server token verification.
      if (!principal || principal.verified !== true ||
          typeof principal.userId !== "string")
        return reply(401, {ok:false,code:"UNAUTHENTICATED"});
      try {
        const result = await backendHandler.handle({
          principal: Object.freeze({verified:true,userId:principal.userId}), body
        });
        if (!Number.isInteger(result?.status) || result.status < 200 ||
            result.status > 599 || !result.body || typeof result.body !== "object")
          throw Error("invalid backend response");
        return reply(result.status, result.body);
      } catch {
        return reply(503, {ok:false,code:"BACKEND_UNAVAILABLE"});
      }
    }
  });
}
