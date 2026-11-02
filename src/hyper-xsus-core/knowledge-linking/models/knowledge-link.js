/**
 * Hyper XSUS Core — Knowledge Link Model
 * Version: 1.0.0
 *
 * Përfaqëson një lidhje të strukturuar ndërmjet dy njësive të dijes.
 * Ky modul nuk ruan grafikun e plotë dhe nuk kryen validim të jashtëm.
 */

export const KNOWLEDGE_LINK_VERSION = "1.0.0";

export const KNOWLEDGE_LINK_RELATION_TYPES = Object.freeze([
  "supports",
  "depends_on",
  "contains",
  "part_of",
  "causes",
  "derived_from",
  "related_to",
  "contradicts",
  "implements",
  "specializes",
]);

const REQUIRED_TEXT_FIELDS = [
  "id",
  "sourceId",
  "targetId",
  "relationType",
];

function requireNonEmptyString(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(
      `KnowledgeLink: "${fieldName}" must be a non-empty string.`,
    );
  }

  return value.trim();
}

function validateConfidence(value) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new TypeError(
      "KnowledgeLink: confidence must be a number between 0 and 1.",
    );
  }

  return value;
}

function validateMetadata(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new TypeError(
      "KnowledgeLink: metadata must be an object.",
    );
  }

  return Object.freeze({ ...value });
}

export function createKnowledgeLink(input) {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new TypeError(
      "KnowledgeLink: input must be an object.",
    );
  }

  const id = requireNonEmptyString(input.id, "id");
  const sourceId = requireNonEmptyString(
    input.sourceId,
    "sourceId",
  );
  const targetId = requireNonEmptyString(
    input.targetId,
    "targetId",
  );

  if (sourceId === targetId) {
    throw new TypeError(
      "KnowledgeLink: sourceId and targetId must be different.",
    );
  }

  const relationType = requireNonEmptyString(
    input.relationType,
    "relationType",
  );

  if (!KNOWLEDGE_LINK_RELATION_TYPES.includes(relationType)) {
    throw new TypeError(
      `KnowledgeLink: unsupported relationType "${relationType}".`,
    );
  }

  const confidence =
    input.confidence === undefined
      ? 1
      : validateConfidence(input.confidence);

  const createdAt =
    input.createdAt === undefined
      ? new Date().toISOString()
      : input.createdAt;

  if (
    typeof createdAt !== "string" ||
    !Number.isFinite(Date.parse(createdAt))
  ) {
    throw new TypeError(
      "KnowledgeLink: createdAt must be a valid date string.",
    );
  }

  const metadata =
    input.metadata === undefined
      ? Object.freeze({})
      : validateMetadata(input.metadata);

  const link = {
    id,
    sourceId,
    targetId,
    relationType,
    confidence,
    createdAt,
    metadata,
  };

  return Object.freeze(link);
}
