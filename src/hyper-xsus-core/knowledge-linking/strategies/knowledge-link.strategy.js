/**
 * XSUS Hyper Core — KnowledgeLink Strategy
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Përcaktimi i strategjive të përzgjedhjes së lidhjeve.
 * - Validimi i konfigurimit të strategjisë.
 * - Standardizimi i kritereve të përzgjedhjes.
 * - Ruajtja e konfigurimeve pa mutacion.
 *
 * Ky komponent nuk kryen kërkime dhe nuk ndryshon lidhjet.
 */

export const KNOWLEDGE_LINK_STRATEGY_VERSION = "1.0.0";

export const KNOWLEDGE_LINK_STRATEGY_TYPES = Object.freeze([
  "direct",
  "reverse",
  "bidirectional",
  "relation",
  "entity",
  "combined",
]);

export const KNOWLEDGE_LINK_STRATEGY_ERROR_CODES = Object.freeze({
  INVALID_INPUT: "KNOWLEDGE_LINK_STRATEGY_INVALID_INPUT",
  INVALID_TYPE: "KNOWLEDGE_LINK_STRATEGY_INVALID_TYPE",
  INVALID_FILTERS: "KNOWLEDGE_LINK_STRATEGY_INVALID_FILTERS",
  INVALID_LIMIT: "KNOWLEDGE_LINK_STRATEGY_INVALID_LIMIT",
  INVALID_CONFIDENCE: "KNOWLEDGE_LINK_STRATEGY_INVALID_CONFIDENCE",
});

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function requireNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string.`);
  }

  return value.trim();
}

function validateFilters(filters) {
  if (!isPlainObject(filters)) {
    throw new TypeError("filters must be a plain object.");
  }

  const normalized = {};

  for (const field of [
    "sourceId",
    "targetId",
    "relationType",
    "entityId",
  ]) {
    if (filters[field] !== undefined) {
      normalized[field] = requireNonEmptyString(
        filters[field],
        `filters.${field}`,
      );
    }
  }

  return Object.freeze(normalized);
}

function validateLimit(limit) {
  if (
    limit !== undefined &&
    (!Number.isInteger(limit) || limit < 1)
  ) {
    throw new TypeError("limit must be a positive integer.");
  }

  return limit ?? null;
}

function validateMinimumConfidence(value) {
  if (
    value !== undefined &&
    (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > 1
    )
  ) {
    throw new TypeError(
      "minimumConfidence must be a number between 0 and 1.",
    );
  }

  return value ?? null;
}

/**
 * Krijon një strategji të standardizuar për përzgjedhjen e lidhjeve.
 */
export function createKnowledgeLinkStrategy(input) {
  if (!isPlainObject(input)) {
    throw new TypeError("Strategy input must be a plain object.");
  }

  const type = requireNonEmptyString(input.type, "type");

  if (!KNOWLEDGE_LINK_STRATEGY_TYPES.includes(type)) {
    throw new TypeError(
      `Unsupported strategy type: ${type}.`,
    );
  }

  const filters = validateFilters(input.filters ?? {});
  const limit = validateLimit(input.limit);
  const minimumConfidence = validateMinimumConfidence(
    input.minimumConfidence,
  );

  if (
    type === "direct" &&
    !filters.sourceId
  ) {
    throw new TypeError(
      "Direct strategy requires filters.sourceId.",
    );
  }

  if (
    type === "reverse" &&
    !filters.targetId
  ) {
    throw new TypeError(
      "Reverse strategy requires filters.targetId.",
    );
  }

  if (
    type === "bidirectional" &&
    (!filters.sourceId || !filters.targetId)
  ) {
    throw new TypeError(
      "Bidirectional strategy requires sourceId and targetId.",
    );
  }

  if (
    type === "relation" &&
    !filters.relationType
  ) {
    throw new TypeError(
      "Relation strategy requires filters.relationType.",
    );
  }

  if (
    type === "entity" &&
    !filters.entityId
  ) {
    throw new TypeError(
      "Entity strategy requires filters.entityId.",
    );
  }

  if (
    type === "combined" &&
    Object.keys(filters).length < 2
  ) {
    throw new TypeError(
      "Combined strategy requires at least two filters.",
    );
  }

  return Object.freeze({
    version: KNOWLEDGE_LINK_STRATEGY_VERSION,
    type,
    filters,
    limit,
    minimumConfidence,
  });
}

/**
 * Kontrollon nëse një objekt është strategji e vlefshme.
 */
export function isKnowledgeLinkStrategy(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  try {
    const normalized = createKnowledgeLinkStrategy({
      type: value.type,
      filters: value.filters,
      limit: value.limit ?? undefined,
      minimumConfidence:
        value.minimumConfidence ?? undefined,
    });

    return (
      value.version === KNOWLEDGE_LINK_STRATEGY_VERSION &&
      normalized.type === value.type
    );
  } catch {
    return false;
  }
}

/**
 * Kthen një përshkrim të pandryshueshëm të strategjisë.
 */
export function describeKnowledgeLinkStrategy(strategy) {
  if (!isKnowledgeLinkStrategy(strategy)) {
    throw new TypeError("Invalid KnowledgeLink strategy.");
  }

  return Object.freeze({
    version: strategy.version,
    type: strategy.type,
    filterFields: Object.freeze(
      Object.keys(strategy.filters),
    ),
    hasLimit: strategy.limit !== null,
    hasMinimumConfidence:
      strategy.minimumConfidence !== null,
  });
}
