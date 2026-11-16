/**
 * XSUS App browser transport for Hyper application plan/build.
 * Independent of XSUS AI Core. Disabled until server ownership/RLS and
 * real Hyper executors are deployed and verified.
 */
import { createHyperApplicationRequest, parseHyperApplicationResponse } from
  "../../src/platform/xsus-app/xsus-hyper-application-contract.js";

const PATH = "/api/xsus-app/hyper/application";
const TOKEN = /^[A-Za-z0-9_.-]{16,8192}$/;

export function createHyperApplicationClient({
  getAccessToken, fetchImpl = globalThis.fetch,
  enabled = false, endpoint = PATH
} = {}) {
  if (typeof getAccessToken !== "function" || typeof fetchImpl !== "function")
    throw new TypeError("A token provider and fetch implementation are required.");
  if (endpoint !== PATH)
    throw new TypeError("Only the same-origin Hyper application endpoint is allowed.");

  return Object.freeze({
    enabled: enabled === true,
    async execute({ operation, projectId, prompt } = {}) {
      if (enabled !== true)
        return Object.freeze({ ok: false, code: "HYPER_APPLICATION_DISABLED" });
      let request;
      try {
        request = createHyperApplicationRequest({ operation, projectId, prompt });
      } catch {
        return Object.freeze({ ok: false, code: "INVALID_REQUEST" });
      }
      let token;
      try { token = await getAccessToken(); }
      catch { return Object.freeze({ ok: false, code: "UNAUTHENTICATED" }); }
      if (typeof token !== "string" || !TOKEN.test(token))
        return Object.freeze({ ok: false, code: "UNAUTHENTICATED" });
      try {
        const response = await fetchImpl(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token
          },
          body: JSON.stringify(request),
          credentials: "omit", cache: "no-store", redirect: "error"
        });
        if (response?.status === 401)
          return Object.freeze({ ok: false, code: "UNAUTHENTICATED" });
        if (response?.status === 403)
          return Object.freeze({ ok: false, code: "ACCESS_DENIED" });
        if (response?.status === 503)
          return Object.freeze({ ok: false, code: "HYPER_APPLICATION_UNAVAILABLE" });
        if (response?.status !== 200 || typeof response.json !== "function")
          return Object.freeze({ ok: false, code: "HYPER_APPLICATION_FAILED" });
        const data = await response.json();
        if (data?.ok !== true)
          return Object.freeze({ ok: false, code: "INVALID_SERVER_RESPONSE" });
        const validated = parseHyperApplicationResponse(data, { operation, projectId });
        return Object.freeze({ ok: true, ...validated });
      } catch {
        return Object.freeze({ ok: false, code: "NETWORK_OR_RESPONSE_ERROR" });
      }
    }
  });
}
