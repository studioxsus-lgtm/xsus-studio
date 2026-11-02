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

  for (const field of REQUIRED_TEXT_FIELDS) {
    requireNonEmptyString(input[field], field);
  }

  if (input.sourceId === input.targetId) {
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

  const confidence = input.confidence ?? 1;

  if (
    typeof confidence !== "number" ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 1
  ) {
    throw new TypeError(
      "KnowledgeLink: confidence must be a number between 0 and 1.",
    );
  }

  const createdAt = input.createdAt ?? new Date().toISOString();

  if (
    typeof createdAt !== "string" ||
    !Number.isFinite(Date.parse(createdAt))
  ) {
    throw new TypeError(
      "KnowledgeLink: createdAt must be a valid date string.",
    );
  }

  const link = {
    id: input.id.trim(),
    sourceId: input.sourceId.trim(),
    targetId: input.targetId.trim(),
    relationType,
    confidence,
    createdAt,
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  };

  return Object.freeze(link);
}
