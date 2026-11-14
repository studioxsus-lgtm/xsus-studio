/**
 * Hyper v8.2.11 — Render deployment attestation boundary.
 * Server-owned read-only provider. No client-supplied deployment events.
 * Provider output must be authenticated by its implementation; this wrapper
 * only validates the resulting deployment transition and event chronology.
 */
import { inspectHyperRestartIntegrity } from "./hyper-v8210-restart-integrity.js";

export const HYPER_RENDER_ATTESTATION_VERSION = "8.2.11";
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const TIMESTAMP = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/;

export function createHyperRenderAttestor({ readDeploymentEvent } = {}) {
  return Object.freeze({
    async attest({ before, after } = {}) {
      if (typeof readDeploymentEvent !== "function")
        return Object.freeze({ verified: false, blockers: Object.freeze(["RENDER_PROVIDER_NOT_CONFIGURED"]) });
      try {
        // Never pass caller-controlled credentials, endpoints or event IDs.
        const event = await readDeploymentEvent();
        if (!event || event.provider !== "render" ||
            event.authenticated !== true ||
            ![event.eventId, event.previousDeploymentId, event.currentDeploymentId]
              .every(x => typeof x === "string" && ID.test(x)) ||
            typeof event.completedAt !== "string" || !TIMESTAMP.test(event.completedAt)) {
          return Object.freeze({ verified: false, blockers: Object.freeze(["RENDER_EVENT_UNTRUSTED"]) });
        }
        const result = inspectHyperRestartIntegrity({
          before,
          after,
          restart: {
            verified: true,
            eventId: event.eventId,
            previousDeploymentId: event.previousDeploymentId,
            currentDeploymentId: event.currentDeploymentId,
            completedAt: event.completedAt
          }
        });
        return Object.freeze({
          version: HYPER_RENDER_ATTESTATION_VERSION,
          verified: result.verified,
          blockers: result.blockers,
          source: "server-owned-render-provider"
        });
      } catch {
        return Object.freeze({
          version: HYPER_RENDER_ATTESTATION_VERSION,
          verified: false,
          blockers: Object.freeze(["RENDER_PROVIDER_READ_FAILED"])
        });
      }
    }
  });
}
