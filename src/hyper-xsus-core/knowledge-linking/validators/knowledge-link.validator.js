/**
 * Hyper XSUS Core
 * KnowledgeLink Validator
 *
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Kontrolli i strukturës së KnowledgeLink.
 * - Validimi i fushave të detyrueshme.
 * - Kontrolli i relation types.
 * - Validimi i confidence dhe createdAt.
 * - Kontrolli i metadata.
 * - Kthimi i rezultateve të standardizuara.
 */

import {
  KNOWLEDGE_LINK_RELATION_TYPES,
} from "../models/knowledge-link.js";

export const KNOWLEDGE_LINK_VALIDATOR_VERSION = "1.0.0";

export const KNOWLEDGE_LINK_VALIDATION_ERROR_CODES =
  Object.freeze({
    INVALID_INPUT: "INVALID_INPUT",
    INVALID_ID: "INVALID_ID",
    INVALID_SOURCE_ID: "INVALID_SOURCE_ID",
    INVALID_TARGET_ID: "INVALID_TARGET_ID",
    SAME_SOURCE_AND_TARGET: "SAME_SOURCE_AND_TARGET",
    INVALID_RELATION_TYPE: "INVALID_RELATION_TYPE",
    INVALID_CONFIDENCE: "INVALID_CONFIDENCE",
    INVALID_CREATED_AT: "INVALID_CREATED_AT",
    INVALID_METADATA: "INVALID_METADATA",
  });

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

function isNonEmptyString(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function isValidDateTime(value) {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    return false;
  }

  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp);
}

function createError(code, field, message) {
  return Object.freeze({
    code,
    field,
    message,
  });
}

export function validateKnowledgeLink(input) {
  const errors = [];

  if (!isPlainObject(input)) {
    return Object.freeze({
      valid: false,
      errors: Object.freeze([
        createError(
          KNOWLEDGE_LINK_VALIDATION_ERROR_CODES.INVALID_INPUT,
          "input",
          "KnowledgeLink duhet të jetë objekt i vlefshëm.",
        ),
      ]),
    });
  }

  if (!isNonEmptyString(input.id)) {
    errors.push(
      createError(
        KNOWLEDGE_LINK_VALIDATION_ERROR_CODES.INVALID_ID,
        "id",
        "ID duhet të jetë tekst jo bosh.",
      ),
    );
  }

  if (!isNonEmptyString(input.sourceId)) {
    errors.push(
      createError(
        KNOWLEDGE_LINK_VALIDATION_ERROR_CODES.INVALID_SOURCE_ID,
        "sourceId",
        "sourceId duhet të jetë tekst jo bosh.",
      ),
    );
  }

  if (!isNonEmptyString(input.targetId)) {
    errors.push(
      createError(
        KNOWLEDGE_LINK_VALIDATION_ERROR_CODES.INVALID_TARGET_ID,
        "targetId",
        "targetId duhet të jetë tekst jo bosh.",
      ),
    );
  }

  if (
    isNonEmptyString(input.sourceId) &&
    isNonEmptyString(input.targetId) &&
    input.sourceId.trim() === input.targetId.trim()
  ) {
    errors.push(
      createError(
        KNOWLEDGE_LINK_VALIDATION_ERROR_CODES.SAME_SOURCE_AND_TARGET,
        "targetId",
        "sourceId dhe targetId nuk mund të jenë të njëjta.",
      ),
    );
  }

  if (
    typeof input.relationType !== "string" ||
    !KNOWLEDGE_LINK_RELATION_TYPES.includes(
      input.relationType.trim(),
    )
  ) {
    errors.push(
      createError(
        KNOWLEDGE_LINK_VALIDATION_ERROR_CODES.INVALID_RELATION_TYPE,
        "relationType",
        "relationType nuk është i mbështetur.",
      ),
    );
  }

  if (
    typeof input.confidence !== "number" ||
    !Number.isFinite(input.confidence) ||
    input.confidence < 0 ||
    input.confidence > 1
  ) {
    errors.push(
      createError(
        KNOWLEDGE_LINK_VALIDATION_ERROR_CODES.INVALID_CONFIDENCE,
        "confidence",
        "confidence duhet të jetë numër nga 0 deri në 1.",
      ),
    );
  }

  if (!isValidDateTime(input.createdAt)) {
    errors.push(
      createError(
        KNOWLEDGE_LINK_VALIDATION_ERROR_CODES.INVALID_CREATED_AT,
        "createdAt",
        "createdAt duhet të jetë datë e vlefshme.",
      ),
    );
  }

  if (!isPlainObject(input.metadata)) {
    errors.push(
      createError(
        KNOWLEDGE_LINK_VALIDATION_ERROR_CODES.INVALID_METADATA,
        "metadata",
        "metadata duhet të jetë objekt i vlefshëm.",
      ),
    );
  }

  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
  });
}
