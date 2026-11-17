/**
 * Hyper XSUS Core — Workflow Resource Budget v1.0.0
 * Validates a bounded, read-only five-engine request before workflow dispatch.
 * Does not inspect secrets, execute engines, or perform I/O.
 */
export const FIVE_ENGINE_RESOURCE_BUDGET_VERSION = "1.0.0";
const positive = n => Number.isSafeInteger(n) && n >= 0;
export function createFiveEngineResourceBudget({
  maxEvidence = 32, maxFacts = 1024, maxRules = 1024, maxTasks = 512,
  maxRequests = 16, maxTextCodePoints = 4096, maxTotalItems = 2048
} = {}) {
  for (const n of [maxEvidence,maxFacts,maxRules,maxTasks,maxRequests,maxTextCodePoints,maxTotalItems])
    if (!positive(n) || n > 1000000) throw new TypeError("Invalid workflow resource budget.");
  function check(input) {
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new TypeError("Invalid workflow resource request.");
    // Inspect own data descriptors only: never invoke user-defined accessors.
    function readField(name, fallback) {
      const descriptor = Object.getOwnPropertyDescriptor(input, name);
      if (!descriptor) return fallback;
      if (!Object.hasOwn(descriptor, "value"))
        throw new TypeError("Invalid workflow resource accessor: " + name);
      return descriptor.value;
    }
    const fields = [
      ["evidence",maxEvidence],["facts",maxFacts],["rules",maxRules],
      ["tasks",maxTasks],["requests",maxRequests]
    ];
    let total = 0;
    const counts = {};
    for (const [name,limit] of fields) {
      const items = readField(name, []);
      if (!Array.isArray(items) || items.length > limit)
        throw new RangeError("Workflow resource budget exceeded: " + name);
      counts[name] = items.length;
      total += items.length;
    }
    if (total > maxTotalItems) throw new RangeError("Workflow total resource budget exceeded.");
    const query = readField("query", undefined);
    if (typeof query !== "string")
      throw new RangeError("Workflow query resource budget exceeded.");
    // Count code points without allocating an array proportional to input size.
    // Reject as soon as the configured limit is exceeded.
    let queryCodePoints = 0;
    for (const _codePoint of query) {
      if (++queryCodePoints > maxTextCodePoints)
        throw new RangeError("Workflow query resource budget exceeded.");
    }
    return Object.freeze({
      version: FIVE_ENGINE_RESOURCE_BUDGET_VERSION,
      accepted: true, totalItems: total,
      queryCodePoints,
      counts: Object.freeze(counts)
    });
  }
  return Object.freeze({ version: FIVE_ENGINE_RESOURCE_BUDGET_VERSION, check });
}
