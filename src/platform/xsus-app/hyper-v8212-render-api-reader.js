/**
 * Hyper v8.2.12 — server-owned, read-only Render deploy history reader.
 * GET only. No restart, deploy, or environment mutation.
 * A deploy transition does not by itself prove a process restart.
 */
export const HYPER_RENDER_API_READER_VERSION = "8.2.12";
const SERVICE = /^srv-[a-z0-9]+$/i;
const DEPLOY = /^dep-[a-z0-9]+$/i;
const TIME = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/;
const timestamp = s => typeof s === "string" && TIME.test(s) &&
  Number.isFinite(Date.parse(s));

export function createHyperRenderApiReader({
  apiKey, serviceId, fetchImpl = globalThis.fetch
} = {}) {
  if (typeof apiKey !== "string" || !apiKey.trim() ||
      !SERVICE.test(serviceId || "") || typeof fetchImpl !== "function")
    throw new TypeError("Render reader configuration invalid.");

  return Object.freeze({
    async readDeploymentEvent() {
      try {
        const response = await fetchImpl(
          "https://api.render.com/v1/services/" + serviceId + "/deploys?limit=20",
          {
            method: "GET",
            headers: {
              Authorization: "Bearer " + apiKey,
              Accept: "application/json"
            },
            signal: AbortSignal.timeout(10000)
          }
        );
        if (!response?.ok) throw Error("upstream error");
        const body = await response.json();
        if (!Array.isArray(body)) throw Error("invalid response");
        const deploys = body.map(x => x?.deploy).filter(Boolean);
        // Fail closed if a single page is not enough to establish a transition.
        if (deploys.length < 2) throw Error("insufficient history");
        const [current, previous] = deploys;
        if (!DEPLOY.test(current.id || "") || !DEPLOY.test(previous.id || "") ||
            current.id === previous.id || current.status !== "live" ||
            !timestamp(current.finishedAt) || !timestamp(previous.finishedAt) ||
            Date.parse(previous.finishedAt) >= Date.parse(current.finishedAt))
          throw Error("invalid deployment history");
        return Object.freeze({
          provider: "render",
          authenticated: true, // API response authenticated with server-owned key.
          eventId: current.id,
          previousDeploymentId: previous.id,
          currentDeploymentId: current.id,
          completedAt: current.finishedAt,
          // Do not claim this is an actual process restart.
          eventKind: "deployment-transition"
        });
      } catch {
        throw new Error("Render deployment history verification failed.");
      }
    }
  });
}
