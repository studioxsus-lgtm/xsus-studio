/**
 * XSUS Hyper Core — KnowledgeLink Engine
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Krijimi dhe validimi i KnowledgeLink.
 * - Ruajtja e lidhjeve në memorien e engine-it.
 * - Kërkimi përmes Resolver.
 * - Përpunimi i strategjive të kërkimit.
 * - Menaxhimi i ciklit jetësor të lidhjeve.
 */

import {
  createKnowledgeLink,
} from "../models/knowledge-link.js";

import {
  validateKnowledgeLink,
} from "../validators/knowledge-link.validator.js";

import {
  resolveKnowledgeLinks,
} from "../resolvers/knowledge-link.resolver.js";

import {
  createKnowledgeLinkStrategy,
} from "../strategies/knowledge-link.strategy.js";

export const KNOWLEDGE_LINK_ENGINE_VERSION = "1.0.0";

function requireNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string.`);
  }

  return value.trim();
}

function createResult(links) {
  return Object.freeze({
    count: links.length,
    links: Object.freeze([...links]),
  });
}

export function createKnowledgeLinkEngine(options = {}) {
  if (
    options === null ||
    typeof options !== "object" ||
    Array.isArray(options)
  ) {
    throw new TypeError("Engine options must be an object.");
  }

  const links = new Map();
  let closed = false;

  function assertOpen() {
    if (closed) {
      throw new Error("KnowledgeLink Engine is closed.");
    }
  }

  function addLink(input) {
    assertOpen();

    const link = createKnowledgeLink(input);
    const validation = validateKnowledgeLink(link);

    if (!validation.valid) {
      const error = new Error(
        "KnowledgeLink validation failed.",
      );

      error.code = "KNOWLEDGE_LINK_ENGINE_VALIDATION_FAILED";
      error.details = validation.errors;

      throw error;
    }

    if (links.has(link.id)) {
      const error = new Error(
        `KnowledgeLink already exists: ${link.id}.`,
      );

      error.code = "KNOWLEDGE_LINK_ENGINE_DUPLICATE_ID";

      throw error;
    }

    links.set(link.id, link);

    return link;
  }

  function addLinks(inputs) {
    assertOpen();

    if (!Array.isArray(inputs)) {
      throw new TypeError("inputs must be an array.");
    }

    // Validimi dhe kontrolli i ID-ve kryhen para mutacionit.
    const prepared = inputs.map((input) => {
      const link = createKnowledgeLink(input);
      const validation = validateKnowledgeLink(link);

      if (!validation.valid) {
        const error = new Error(
          "KnowledgeLink validation failed.",
        );

        error.code = "KNOWLEDGE_LINK_ENGINE_VALIDATION_FAILED";
        error.details = validation.errors;

        throw error;
      }

      if (links.has(link.id)) {
        const error = new Error(
          `KnowledgeLink already exists: ${link.id}.`,
        );

        error.code = "KNOWLEDGE_LINK_ENGINE_DUPLICATE_ID";

        throw error;
      }

      return link;
    });

    const batchIds = new Set();

    for (const link of prepared) {
      if (batchIds.has(link.id)) {
        const error = new Error(
          `Duplicate ID in batch: ${link.id}.`,
        );

        error.code = "KNOWLEDGE_LINK_ENGINE_DUPLICATE_BATCH_ID";

        throw error;
      }

      batchIds.add(link.id);
    }

    for (const link of prepared) {
      links.set(link.id, link);
    }

    return createResult(prepared);
  }

  function getLinkById(id) {
    assertOpen();

    const normalizedId = requireNonEmptyString(id, "id");

    return links.get(normalizedId) ?? null;
  }

  function listLinks() {
    assertOpen();

    return createResult([...links.values()]);
  }

  function search(filters = {}) {
    assertOpen();

    return resolveKnowledgeLinks(
      [...links.values()],
      filters,
    );
  }

  function searchByStrategy(input) {
    assertOpen();

    const strategy = createKnowledgeLinkStrategy(input);
    const filters = { ...strategy.filters };

    let result = resolveKnowledgeLinks(
      [...links.values()],
      filters,
    );

    if (strategy.minimumConfidence !== null) {
      result = createResult(
        result.links.filter(
          (link) =>
            link.confidence >= strategy.minimumConfidence,
        ),
      );
    }

    if (strategy.limit !== null) {
      result = createResult(
        result.links.slice(0, strategy.limit),
      );
    }

    return result;
  }

  function removeLink(id) {
    assertOpen();

    const normalizedId = requireNonEmptyString(id, "id");

    return links.delete(normalizedId);
  }

  function clear() {
    assertOpen();

    const removedCount = links.size;
    links.clear();

    return Object.freeze({
      removedCount,
    });
  }

  function getStatus() {
    return Object.freeze({
      version: KNOWLEDGE_LINK_ENGINE_VERSION,
      closed,
      size: links.size,
    });
  }

  function close() {
    if (closed) {
      return Object.freeze({
        success: true,
        closed: true,
        alreadyClosed: true,
      });
    }

    links.clear();
    closed = true;

    return Object.freeze({
      success: true,
      closed: true,
      alreadyClosed: false,
    });
  }

  return Object.freeze({
    addLink,
    addLinks,
    getLinkById,
    listLinks,
    search,
    searchByStrategy,
    removeLink,
    clear,
    getStatus,
    close,
  });
}
