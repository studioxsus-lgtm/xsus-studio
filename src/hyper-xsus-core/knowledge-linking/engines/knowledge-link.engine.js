/**
 * XSUS Hyper Core — KnowledgeLink Engine
 * Version: 1.1.0
 *
 * Përgjegjësitë:
 * - Krijimi dhe validimi i KnowledgeLink.
 * - Zbatimi i KnowledgeLink Policy.
 * - Ruajtja e lidhjeve në memorien e engine-it.
 * - Kërkimi përmes Resolver.
 * - Përpunimi semantik i strategjive të kërkimit.
 * - Indeksimi sipas sourceId, targetId dhe relationType.
 * - Ruajtja e rendit të futjes.
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

export const KNOWLEDGE_LINK_ENGINE_VERSION = "1.1.0";

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

  // Koleksioni kryesor ruan rendin e futjes.
  const links = new Map();

  // Indekset dytësore.
  const sourceIdIndex = new Map();
  const targetIdIndex = new Map();
  const relationTypeIndex = new Map();

  // Pozicioni i secilës lidhje në rendin e futjes.
  const insertionOrder = new Map();
  let nextInsertionOrder = 0;

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

  function addToIndex(index, value, id) {
    let ids = index.get(value);

    if (!ids) {
      ids = new Set();
      index.set(value, ids);
    }

    ids.add(id);
  }

  function removeFromIndex(index, value, id) {
    const ids = index.get(value);

    if (!ids) {
      return;
    }

    ids.delete(id);

    if (ids.size === 0) {
      index.delete(value);
    }
  }

  function indexLink(link) {
    addToIndex(
      sourceIdIndex,
      link.sourceId,
      link.id,
    );

    addToIndex(
      targetIdIndex,
      link.targetId,
      link.id,
    );

    addToIndex(
      relationTypeIndex,
      link.relationType,
      link.id,
    );
  }

  function unindexLink(link) {
    removeFromIndex(
      sourceIdIndex,
      link.sourceId,
      link.id,
    );

    removeFromIndex(
      targetIdIndex,
      link.targetId,
      link.id,
    );

    removeFromIndex(
      relationTypeIndex,
      link.relationType,
      link.id,
    );

    insertionOrder.delete(link.id);
  }

  function storeLink(link) {
    links.set(link.id, link);

    insertionOrder.set(
      link.id,
      nextInsertionOrder++,
    );

    indexLink(link);
  }

  function getIndexForFilter(field) {
    switch (field) {
      case "sourceId":
        return sourceIdIndex;

      case "targetId":
        return targetIdIndex;

      case "relationType":
        return relationTypeIndex;

      default:
        return null;
    }
  }

  /**
   * Përzgjedh kandidatët përmes indekseve.
   * Filtrat e tjerë kontrollohen nga Resolver.
   */
  function getIndexedCandidateIds(filters = {}) {
    const indexedFilters = [];

    for (const field of [
      "sourceId",
      "targetId",
      "relationType",
    ]) {
      if (
        filters[field] === undefined ||
        filters[field] === null
      ) {
        continue;
      }

      const index = getIndexForFilter(field);
      const ids = index.get(filters[field]);

      if (!ids) {
        return new Set();
      }

      indexedFilters.push(ids);
    }

    if (indexedFilters.length === 0) {
      return new Set(links.keys());
    }

    // Fillimisht përdorim indeksin më selektiv.
    indexedFilters.sort(
      (first, second) => first.size - second.size,
    );

    const candidates = new Set(indexedFilters[0]);

    for (
      let index = 1;
      index < indexedFilters.length;
      index += 1
    ) {
      const allowedIds = indexedFilters[index];

      for (const id of candidates) {
        if (!allowedIds.has(id)) {
          candidates.delete(id);
        }
      }

      if (candidates.size === 0) {
        break;
      }
    }

    return candidates;
  }

  /**
   * Rikthen lidhjet në rendin origjinal të futjes.
   */
  function getOrderedCandidateLinks(candidateIds) {
    return [...candidateIds]
      .map((id) => ({
        id,
        order: insertionOrder.get(id),
      }))
      .filter(
        (entry) => entry.order !== undefined,
      )
      .sort(
        (first, second) => first.order - second.order,
      )
      .map(
        (entry) => links.get(entry.id),
      )
      .filter(Boolean);
  }

  function findCandidateLinks(filters = {}) {
    const candidateIds = getIndexedCandidateIds(filters);

    return getOrderedCandidateLinks(candidateIds);
  }

  function resolveIndexedFilters(filters = {}) {
    return resolveKnowledgeLinks(
      findCandidateLinks(filters),
      filters,
    );
  }

  function addLink(input) {
    assertOpen();

    const link = prepareLink(input);

    assertUniqueId(link.id);

    storeLink(link);

    return link;
  }

  function addLinks(inputs) {
    assertOpen();

    if (!Array.isArray(inputs)) {
      throw new TypeError("inputs must be an array.");
    }

    // Përgatitja kryhet përpara çdo mutacioni.
    const prepared = inputs.map(prepareLink);
    const batchIds = new Set();

    for (const link of prepared) {
      assertUniqueId(link.id);

      if (batchIds.has(link.id)) {
        const error = new Error(
          `Duplicate ID in batch: ${link.id}.`,
        );

        error.code =
          "KNOWLEDGE_LINK_ENGINE_DUPLICATE_BATCH_ID";

        throw error;
      }

      batchIds.add(link.id);
    }

    // Ruajtja kryhet vetëm pasi i gjithë grupi
    // kalon kontrollet.
    for (const link of prepared) {
      storeLink(link);
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

    return resolveIndexedFilters(filters);
  }

  /**
   * Çdo strategji kthen rezultatet e saj përfundimtare.
   * Nuk duhet të riaplikohen filtrat origjinalë pas
   * zgjidhjes semantike të drejtimit.
   */
  function resolveStrategyLinks(strategy) {
    const filters = { ...strategy.filters };

    switch (strategy.type) {
      case "direct": {
        return resolveIndexedFilters(filters);
      }

      case "reverse": {
        const reverseFilters = { ...filters };

        if (
          reverseFilters.sourceId !== undefined &&
          reverseFilters.targetId !== undefined
        ) {
          const originalSourceId =
            reverseFilters.sourceId;

          reverseFilters.sourceId =
            reverseFilters.targetId;

          reverseFilters.targetId =
            originalSourceId;
        }

        return resolveIndexedFilters(reverseFilters);
      }

      case "bidirectional": {
        if (
          filters.sourceId === undefined ||
          filters.targetId === undefined
        ) {
          return resolveIndexedFilters(filters);
        }

        const forwardResult = resolveIndexedFilters(
          filters,
        );

        const reverseFilters = {
          ...filters,
          sourceId: filters.targetId,
          targetId: filters.sourceId,
        };

        const reverseResult = resolveIndexedFilters(
          reverseFilters,
        );

        const matchingIds = new Set([
          ...forwardResult.links.map(
            (link) => link.id,
          ),
          ...reverseResult.links.map(
            (link) => link.id,
          ),
        ]);

        // Bashkon të dy drejtimet pa dublikime
        // dhe ruan rendin e koleksionit kryesor.
        const orderedResults = [
          ...links.values(),
        ].filter(
          (link) => matchingIds.has(link.id),
        );

        return createResult(orderedResults);
      }

      case "relation":
      case "entity":
      case "combined":
      default: {
        return resolveIndexedFilters(filters);
      }
    }
  }

  function searchByStrategy(input) {
    assertOpen();

    const strategy = createKnowledgeLinkStrategy(input);

    // Rezultati është tashmë i filtruar sipas
    // semantikës së strategjisë.
    let result = resolveStrategyLinks(strategy);

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
    const link = links.get(normalizedId);

    if (!link) {
      return false;
    }

    // Përditësojmë indekset dhe koleksionin.
    unindexLink(link);
    links.delete(normalizedId);

    return true;
  }

  function clear() {
    assertOpen();

    const removedCount = links.size;

    links.clear();

    sourceIdIndex.clear();
    targetIdIndex.clear();
    relationTypeIndex.clear();
    insertionOrder.clear();

    nextInsertionOrder = 0;

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

    sourceIdIndex.clear();
    targetIdIndex.clear();
    relationTypeIndex.clear();
    insertionOrder.clear();

    nextInsertionOrder = 0;

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
