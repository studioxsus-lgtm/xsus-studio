
/**
 * XSUS Hyper Core — XSUS AI KnowledgeLink Adapter
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Lidhja e XSUS AI me KnowledgeLink Public API.
 * - Ofrimi i një ndërfaqeje të standardizuar.
 * - Delegimi i operacioneve te Public API.
 * - Izolimi i XSUS AI nga implementimi i brendshëm.
 *
 * Ky komponent nuk krijon Engine dhe nuk administron
 * drejtpërdrejt të dhënat e KnowledgeLink.
 */

export const XSUS_AI_KNOWLEDGE_ADAPTER_VERSION = "1.0.0";

const REQUIRED_API_METHODS = Object.freeze([
  "create",
  "addMany",
  "getById",
  "find",
  "findByStrategy",
  "findByEntity",
  "remove",
  "getStatus",
]);

function isPlainObject(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function validateKnowledgeAPI(api) {
  if (!isPlainObject(api)) {
    throw new TypeError(
      "KnowledgeLink API must be a plain object.",
    );
  }

  for (const method of REQUIRED_API_METHODS) {
    if (typeof api[method] !== "function") {
      throw new TypeError(
        `KnowledgeLink API is missing method: ${method}.`,
      );
    }
  }
}

/**
 * Krijon adapter-in për XSUS AI.
 */
export function createXsusAIKnowledgeAdapter(api) {
  validateKnowledgeAPI(api);

  let closed = false;

  function assertOpen() {
    if (closed) {
      throw new Error(
        "XSUS AI KnowledgeLink adapter is closed.",
      );
    }
  }

  function createLink(input) {
    assertOpen();
    return api.create(input);
  }

  function addLinks(inputs) {
    assertOpen();
    return api.addMany(inputs);
  }

  function getLink(id) {
    assertOpen();
    return api.getById(id);
  }

  function findLinks(filters = {}) {
    assertOpen();

    if (!isPlainObject(filters)) {
      throw new TypeError(
        "KnowledgeLink filters must be a plain object.",
      );
    }

    return api.find(filters);
  }

  function findByStrategy(strategy) {
    assertOpen();
    return api.findByStrategy(strategy);
  }

  function findRelatedEntities(entityId) {
    assertOpen();
    return api.findByEntity(entityId);
  }

  function removeLink(id) {
    assertOpen();
    return api.remove(id);
  }

  function getStatus() {
    assertOpen();
    return api.getStatus();
  }

  function close() {
    closed = true;
  }

  return Object.freeze({
    version: XSUS_AI_KNOWLEDGE_ADAPTER_VERSION,

    createLink,
    addLinks,
    getLink,
    findLinks,
    findByStrategy,
    findRelatedEntities,
    removeLink,

    getStatus,
    close,
  });
}
