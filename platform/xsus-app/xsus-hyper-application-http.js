/**
 * Hyper XSUS Core HTTP boundary — portable reference handler, NOT deployed.
 * Requires a trusted authorization-first dispatcher and explicit JSON body.
 * Does not create a network listener, fetch, or expose an endpoint.
 */
export function createHyperApplicationHttpHandler({ dispatcher } = {}) {
  if (!dispatcher || typeof dispatcher.dispatch !== "function")
    throw new TypeError("An authorized Hyper dispatcher is required.");

  return async function handleHyperApplicationHttp({ method, headers, body } = {}) {
    const respond = (status, payload) => Object.freeze({
      status,
      headers: Object.freeze({
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      }),
      body: Object.freeze(payload)
    });

    if (method !== "POST")
      return respond(405, { ok: false, code: "METHOD_NOT_ALLOWED" });

    const authorization = headers?.authorization ?? headers?.Authorization;
    if (typeof authorization !== "string" || !authorization.startsWith("Bearer "))
      return respond(401, { ok: false, code: "UNAUTHORIZED" });

    if (typeof body !== "string" || body.length > 32768)
      return respond(400, { ok: false, code: "INVALID_REQUEST" });

    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      return respond(400, { ok: false, code: "INVALID_REQUEST" });
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return respond(400, { ok: false, code: "INVALID_REQUEST" });

    try {
      const result = await dispatcher.dispatch({ authorization, body: parsed });
      return respond(200, { ok: true, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "Unauthorized Hyper application request.")
        return respond(401, { ok: false, code: "UNAUTHORIZED" });
      if (message === "Hyper project access denied." ||
          message === "Hyper operation access denied.")
        return respond(403, { ok: false, code: "ACCESS_DENIED" });
      if (error instanceof TypeError)
        return respond(400, { ok: false, code: "INVALID_REQUEST" });
      return respond(500, { ok: false, code: "HYPER_INTERNAL_ERROR" });
    }
  };
}
