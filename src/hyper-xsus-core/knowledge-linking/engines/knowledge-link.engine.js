/**
 * XSUS Hyper Core — KnowledgeLink Engine
 * Version: 1.2.0
 *
 * Përgjegjësitë:
 * - Krijimi dhe validimi i KnowledgeLink.
 * - Zbatimi i KnowledgeLink Policy.
 * - Ruajtja e lidhjeve në memorien e engine-it.
 * - Kërkimi përmes Resolver.
 * - Përpunimi semantik i strategjive të kërkimit.
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

import {
  createKnowledgeLinkPolicy,
  evaluateKnowledgeLinkPolicy,
} from "../policies/knowledge-link.policy.js";

export const KNOWLEDGE_LINK_ENGINE_VERSION = "1.2.0";

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

function createPolicyError(evaluation) {
  const error = new Error(
    "KnowledgeLink was rejected by policy.",
  );

  error.code = "KNOWLEDGE_LINK_ENGINE_POLICY_REJECTED";
  error.details = evaluation.reasons;

  return error;
}

export function createKnowledgeLinkEngine(options = {}) {
  if (
    options === null ||
    typeof options !== "object" ||
    Array.isArray(options)
  ) {
    throw new TypeError("Engine options must be an object.");
  }

  const policy = createKnowledgeLinkPolicy(
    options.policy ?? {},
  );

  const links = new Map();
  let closed = false;

  function assertOpen() {
    if (closed) {
      throw new Error("KnowledgeLink Engine is closed.");
    }
  }

  function prepareLink(input) {
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

    const evaluation = evaluateKnowledgeLinkPolicy(
      link,
      policy,
    );

    if (!evaluation.allowed) {
      throw createPolicyError(evaluation);
    }

    return link;
  }

  function assertUniqueId(id) {
    if (links.has(id)) {
      const error = new Error(
        `KnowledgeLink already exists: ${id}.`,
      );

      error.code = "KNOWLEDGE_LINK_ENGINE_DUPLICATE_ID";

      throw error;
    }
  }

  function addLink(input) {
    assertOpen();

    const link = prepareLink(input);

    assertUniqueId(link.id);

    links.set(link.id, link);

    return link;
  }

  function addLinks(inputs) {
    assertOpen();

    if (!Array.isArray(inputs)) {
      throw new TypeError("inputs must be an array.");
    }

    // Përgatitja dhe kontrollet kryhen para çdo mutacioni.
    const prepared = inputs.map(prepareLink);
    const batchIds = new Set();

    for (const link of prepared) {
      assertUniqueId(link.id);

      if (batchIds.has(link.id)) {
        const error = new Error(
          `Duplicate ID in batch: ${link.id}.`,
        );

        error.code = "KNOWLEDGE_LINK_ENGINE_DUPLICATE_BATCH_ID";

        throw error;
      }

      batchIds.add(link.id);
    }

    // Ruajtja ndodh vetëm pasi i gjithë grupi kalon kontrollet.
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

  function resolveStrategyLinks(strategy, allLinks) {
    const filters = { ...strategy.filters };

    switch (strategy.type) {
      case "direct": {
        return resolveKnowledgeLinks(
          allLinks,
          filters,
        );
      }

      case "reverse": {
        const reverseFilters = { ...filters };

        if (
          reverseFilters.sourceId !== undefined &&
          reverseFilters.targetId !== undefined
        ) {
          const originalSourceId = reverseFilters.sourceId;

          reverseFilters.sourceId = reverseFilters.targetId;
          reverseFilters.targetId = originalSourceId;
        }

        return resolveKnowledgeLinks(
          allLinks,
          reverseFilters,
        );
      }

      case "bidirectional": {
        if (
          filters.sourceId === undefined ||
          filters.targetId === undefined
        ) {
          return resolveKnowledgeLinks(
            allLinks,
            filters,
          );
        }

        const forwardResult = resolveKnowledgeLinks(
          allLinks,
          filters,
        );

        const reverseFilters = {
          ...filters,
          sourceId: filters.targetId,
          targetId: filters.sourceId,
        };

        const reverseResult = resolveKnowledgeLinks(
          allLinks,
          reverseFilters,
        );

        const matchingIds = new Set([
          ...forwardResult.links.map((link) => link.id),
          ...reverseResult.links.map((link) => link.id),
        ]);

        // Ruajmë rendin origjinal dhe shmangim dublikimet.
        const orderedResults = allLinks.filter(
          (link) => matchingIds.has(link.id),
        );

        return createResult(orderedResults);
      }

      case "relation":
      case "entity":
      case "combined":
      default: {
        return resolveKnowledgeLinks(
          allLinks,
          filters,
        );
      }
    }
  }

  function searchByStrategy(input) {
    assertOpen();

    const strategy = createKnowledgeLinkStrategy(input);
    const allLinks = [...links.values()];

    let result = resolveStrategyLinks(
      strategy,
      allLinks,
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
      policyVersion: policy.version,
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
