import { createTextBoundaryEngine } from "./text-boundary-engine.js";
import { createRuntimeCircuitBreaker } from "./runtime-circuit-breaker.js";
/** Independent engine routing with explicit priority and bounded failover. */
export const ENGINE_ROUTING_COORDINATOR_VERSION = "1.0.0";
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
export function createEngineRoutingCoordinator({
  engines, maxCodePoints = 4096, failureThreshold = 3, resetAfterMs = 30000,
  clock = Date.now
} = {}) {
  if (!Array.isArray(engines) || engines.length < 1 || engines.length > 16)
    throw new TypeError("Invalid engine routing configuration.");
  const boundary = createTextBoundaryEngine({ maxCodePoints });
  const names = new Set();
  const routes = engines.map(engine => {
    if (!engine || typeof engine.name !== "string" || !ID.test(engine.name) ||
        names.has(engine.name) || typeof engine.supports !== "function" ||
        typeof engine.process !== "function") throw new TypeError("Invalid engine routing entry.");
    names.add(engine.name);
    return Object.freeze({ name: engine.name, supports: engine.supports,
      process: engine.process,
      breaker: createRuntimeCircuitBreaker({ failureThreshold, resetAfterMs, clock }) });
  });
  async function route({ text, language = "en", context = null } = {}) {
    const normalized = boundary.normalize(text);
    if (typeof language !== "string" || !ID.test(language) || normalized.empty)
      throw new TypeError("Invalid engine routing request.");
    const failures = [];
    for (const engine of routes) {
      let supported;
      try { supported = await engine.supports({ language }); }
      catch { failures.push(engine.name); continue; }
      if (supported !== true) continue;
      try {
        const result = await engine.breaker.execute(() => engine.process({
          text: normalized.text, language, context
        }));
        if (!result || typeof result !== "object" || Array.isArray(result))
          throw new Error("Invalid engine result.");
        return Object.freeze({ version: ENGINE_ROUTING_COORDINATOR_VERSION,
          engine: engine.name, result, degraded: failures.length > 0 });
      } catch { failures.push(engine.name); }
    }
    const error = new Error("No available engine could process the request.");
    error.code = "HYPER_ENGINE_UNAVAILABLE";
    throw error;
  }
  return Object.freeze({ version: ENGINE_ROUTING_COORDINATOR_VERSION, route,
    health: () => Object.freeze(routes.map(engine =>
      Object.freeze({ name: engine.name, ...engine.breaker.status() }))) });
}
