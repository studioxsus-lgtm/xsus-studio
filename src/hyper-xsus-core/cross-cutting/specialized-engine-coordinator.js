/** Independent coordinator for specialized engines, with bounded validated results. */
import { createStructuredOutputGuard } from "./structured-output-guard.js";
export const SPECIALIZED_ENGINE_COORDINATOR_VERSION = "1.0.0";
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
export function createSpecializedEngineCoordinator({ engines, maxEngines = 16, maxDepth = 8, maxNodes = 2048 } = {}) {
  if (!Number.isSafeInteger(maxEngines) || maxEngines < 1 || maxEngines > 256 ||
      !Array.isArray(engines) || !engines.length || engines.length > maxEngines)
    throw new TypeError("Invalid specialized engine configuration.");
  const guard = createStructuredOutputGuard({ maxDepth, maxNodes });
  const map = new Map();
  for (const engine of engines) {
    if (!engine || typeof engine.name !== "string" || !ID.test(engine.name) ||
        map.has(engine.name) || typeof engine.execute !== "function")
      throw new TypeError("Invalid specialized engine.");
    map.set(engine.name, engine.execute);
  }
  function validateRequests(requests) {
    if (!Array.isArray(requests) || requests.length > maxEngines)
      throw new TypeError("Invalid specialized requests.");
    // Validate the entire batch before invoking any engine.
    const used = new Set();
    const prepared = requests.map(request => {
      if (!request || typeof request.engine !== "string" || !map.has(request.engine) ||
          used.has(request.engine)) throw new TypeError("Invalid specialized engine request.");
      used.add(request.engine);
      return { engine: request.engine, payload: guard.validate(request.payload) };
    });
    return Object.freeze(prepared.map(request => Object.freeze(request)));
  }
  async function coordinate({ requests } = {}) {
    const prepared = validateRequests(requests);
    const results = [];
    for (const request of prepared) {
      const payload = request.payload;
      try {
        const output = await map.get(request.engine)(payload);
        results.push(Object.freeze({ engine: request.engine, status: "completed",
          output: guard.validate(output) }));
      } catch {
        results.push(Object.freeze({ engine: request.engine, status: "failed", output: null }));
      }
    }
    return Object.freeze({ version: SPECIALIZED_ENGINE_COORDINATOR_VERSION,
      results: Object.freeze(results), completed: results.filter(r => r.status === "completed").length,
      failed: results.filter(r => r.status === "failed").length, sideEffectsGuaranteedAbsent: false });
  }
  return Object.freeze({ version: SPECIALIZED_ENGINE_COORDINATOR_VERSION, coordinate });
}
