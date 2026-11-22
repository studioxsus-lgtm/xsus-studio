import {CoordinationError} from "./phase-12-5.js";
export const HYPER_ENGINE_CATALOG_VERSION = "12.5.4";
export const HYPER_ENGINE_IDS = Object.freeze([
  "truth-verification", "learning", "strategic-planning",
  "autonomous-execution", "self-improvement", "multi-agent", "orchestration"
]);
const NON_EXECUTING = new Set(["truth-verification","strategic-planning"]);
const validId = s => typeof s === "string" && HYPER_ENGINE_IDS.includes(s);
export function createHyperEngineCatalog({engines = {}, approved = []} = {}) {
  if (!engines || typeof engines !== "object" || Array.isArray(engines) ||
      !Array.isArray(approved) || approved.some(id => !validId(id) || !NON_EXECUTING.has(id)))
    throw new CoordinationError("invalid_catalog");
  const entries = Object.freeze(HYPER_ENGINE_IDS.map(id => Object.freeze({
    id, registered:typeof engines[id] === "function",
    callable:approved.includes(id) && typeof engines[id] === "function" && NON_EXECUTING.has(id)
  })));
  return Object.freeze({
    version:HYPER_ENGINE_CATALOG_VERSION,
    list:()=>entries,
    async invoke({engineId,payload,signal}={}) {
      if (!validId(engineId)) throw new CoordinationError("unknown_engine");
      const entry=entries.find(item=>item.id===engineId);
      if (!entry.callable) throw new CoordinationError("engine_not_approved");
      if (signal?.aborted) throw new CoordinationError("aborted");
      if (!payload || typeof payload !== "object" || Array.isArray(payload))
        throw new CoordinationError("invalid_request");
      const result=await engines[engineId]({payload,signal});
      if (signal?.aborted) throw new CoordinationError("aborted");
      if (!result || typeof result !== "object" || Array.isArray(result) ||
          result.executable !== false || result.sideEffects !== false)
        throw new CoordinationError("unsafe_engine_result");
      return Object.freeze({engineId,executable:false,sideEffects:false,status:"completed"});
    }
  });
}
