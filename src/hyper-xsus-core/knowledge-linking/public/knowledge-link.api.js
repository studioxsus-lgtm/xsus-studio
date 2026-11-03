
/**
 * XSUS Hyper Core — KnowledgeLink Public API
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Ofrimi i një API-je publike për KnowledgeLink.
 * - Izolimi i konsumatorëve nga implementimi i Engine-it.
 * - Standardizimi i operacioneve publike.
 * - Ruajtja e kompatibilitetit me Engine-in ekzistues.
 *
 * Ky komponent nuk implementon logjikë të brendshme
 * të kërkimit, validimit apo ruajtjes.
 */

import {
  createKnowledgeLinkEngine,
} from "../engines/knowledge-link.engine.js";

export const KNOWLEDGE_LINK_API_VERSION = "1.0.0";

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

function requireNonEmptyString(value, field) {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new TypeError(
      `${field} must be a non-empty string.`,
    );
  }

  return value.trim();
}

/**
 * Krijon një instancë publike të KnowledgeLink API.
 */
export function createKnowledgeLinkAPI(options = {}) {
  if (!isPlainObject(options)) {
    throw new TypeError(
      "KnowledgeLink API options must be a plain object.",
    );
  }

  const engine = createKnowledgeLinkEngine(options);

  let closed = false;

  function assertOpen() {
    if (closed) {
      throw new Error(
        "KnowledgeLink API is closed.",
      );
    }
  }

  function create(input) {
    assertOpen();

    return engine.addLink(input);
  }

  function add(input) {
    assertOpen();

    return engine.addLink(input);
  }

  function addMany(inputs) {
    assertOpen();

    if (!Array.isArray(inputs)) {
      throw new TypeError(
        "inputs must be an array.",
      );
    }

    return engine.addLinks(inputs);
  }

  function getById(id) {
    assertOpen();

    return engine.getLinkById(
      requireNonEmptyString(id, "id"),
    );
  }

  function find(filters = {}) {
    assertOpen();

    if (!isPlainObject(filters)) {
      throw new TypeError(
        "filters must be a plain object.",
      );
    }

    return engine.search(filters);
  }

  function findByStrategy(strategy) {
    assertOpen();

    return engine.searchByStrategy(strategy);
  }

  function findByEntity(entityId) {
    assertOpen();

    return engine.search({
      entityId: requireNonEmptyString(
        entityId,
        "entityId",
      ),
    });
  }

  function remove(id) {
    assertOpen();

    return engine.removeLink(
      requireNonEmptyString(id, "id"),
    );
  }

  function clear() {
    assertOpen();

    return engine.clear();
  }

  function getStatus() {
    return engine.getStatus();
  }

  function verifyIntegrity() {
    assertOpen();

    return engine.verifyIndexIntegrity();
  }

  function rebuildIndexes() {
    assertOpen();

    return engine.rebuildIndexes();
  }

  function recoverIntegrity() {
    assertOpen();

    return engine.recoverIndexIntegrity();
  }

  function close() {
    if (closed) {
      return;
    }

    engine.close();
    closed = true;
  }

  return Object.freeze({
    version: KNOWLEDGE_LINK_API_VERSION,

    create,
    add,
    addMany,
    getById,
    find,
    findByStrategy,
    findByEntity,
    remove,
    clear,

    getStatus,
    verifyIntegrity,
    rebuildIndexes,
    recoverIntegrity,

    close,
  });
}
