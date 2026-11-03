
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
 * - Kontrolli i metadata JSON-compatible.
 * - Refuzimi i fushave shtesë.
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
    INVALID_FIELDS: "INVALID_FIELDS",
  });

const ALLOWED_FIELDS = Object.freeze([
  "id",
  "sourceId",
  "targetId",
  "relationType",
  "confidence",
  "createdAt",
  "metadata",
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

function isNonEmptyString(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

/**
 * Kontrollon formatin strikt RFC3339:
 *
 * YYYY-MM-DDTHH:mm:ss[.fraction](Z|±HH:mm)
 *
 * Kërkohet timezone eksplicite.
 */
function isValidDateTime(value) {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim();

  const match = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/,
  );

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const timezone = match[8];

  if (
    month < 1 ||
    month > 12 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return false;
  }

  const leapYear =
    year % 4 === 0 &&
    (year % 100 !== 0 || year % 400 === 0);

  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  if (
    day < 1 ||
    day > daysInMonth[month - 1]
  ) {
    return false;
  }

  if (timezone !== "Z") {
    const offsetHour = Number(
      timezone.slice(1, 3),
    );

    const offsetMinute = Number(
      timezone.slice(4, 6),
    );

    if (
      offsetHour > 23 ||
      offsetMinute > 59
    ) {
      return false;
    }
  }

  return Number.isFinite(Date.parse(normalized));
}

/**
 * Kontrollon nëse vlera është JSON-compatible.
 *
 * Lejohen:
 * - null
 * - string
 * - boolean
 * - numra finite
 * - arrays
 * - plain objects
 *
 * Refuzohen:
 * - undefined
 * - function
 * - symbol
 * - bigint
 * - NaN / Infinity
 * - Date dhe objekte speciale
 * - referenca ciklike
 * - property accessors
 */
function isJSONCompatible(value, ancestors = new WeakSet()) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value !== "object") {
    return false;
  }

  if (
    !Array.isArray(value) &&
    !isPlainObject(value)
  ) {
    return false;
  }

  if (ancestors.has(value)) {
    return false;
  }

  ancestors.add(value);

  try {
    if (Reflect.ownKeys(value).some(
      (key) => typeof key === "symbol",
    )) {
      return false;
    }

    if (Array.isArray(value)) {
      const keys = Reflect.ownKeys(value);

      for (const key of keys) {
        if (key === "length") {
          continue;
        }

        if (
          typeof key !== "string" ||
          !/^(0|[1-9]\d*)$/.test(key) ||
          Number(key) >= value.length
        ) {
          return false;
        }

        const descriptor =
          Object.getOwnPropertyDescriptor(value, key);

        if (
          !descriptor ||
          !Object.prototype.hasOwnProperty.call(
            descriptor,
            "value",
          )
        ) {
          return false;
        }

        if (
          !isJSONCompatible(
            descriptor.value,
            ancestors,
          )
        ) {
          return false;
        }
      }

      // Refuzon elementet e pambushura.
      if (keys.length - 1 !== value.length) {
        return false;
      }

      return true;
    }

    for (const key of Reflect.ownKeys(value)) {
      const descriptor =
        Object.getOwnPropertyDescriptor(value, key);

      if (
        !descriptor ||
        !Object.prototype.hasOwnProperty.call(
          descriptor,
          "value",
        )
      ) {
        return false;
      }

      if (
        !isJSONCompatible(
          descriptor.value,
          ancestors,
        )
      ) {
        return false;
      }
    }

    return true;
  } finally {
    ancestors.delete(value);
  }
}

function createError(code, field, message) {
  return Object.freeze({
    code,
    field,
    message,
  });
}

function validateAllowedFields(input, errors) {
  const unexpectedFields = Reflect.ownKeys(input)
    .filter(
      (field) =>
        typeof field !== "string" ||
        !ALLOWED_FIELDS.includes(field),
    );

  if (unexpectedFields.length > 0) {
    errors.push(
      createError(
        KNOWLEDGE_LINK_VALIDATION_ERROR_CODES.INVALID_FIELDS,
        "input",
        "KnowledgeLink përmban fusha të palejuara.",
      ),
    );
  }
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

  validateAllowedFields(input, errors);

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
        "createdAt duhet të jetë datë RFC3339 e vlefshme me timezone.",
      ),
    );
  }

  if (
    !isPlainObject(input.metadata) ||
    !isJSONCompatible(input.metadata)
  ) {
    errors.push(
      createError(
        KNOWLEDGE_LINK_VALIDATION_ERROR_CODES.INVALID_METADATA,
        "metadata",
        "metadata duhet të jetë objekt JSON-compatible.",
      ),
    );
  }

  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
  });
}
