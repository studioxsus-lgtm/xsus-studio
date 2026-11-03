
/**
 * Hyper XSUS Core — Knowledge Link Model
 * Version: 1.0.0
 *
 * Përfaqëson një lidhje të strukturuar ndërmjet dy njësive të dijes.
 *
 * Përgjegjësitë:
 * - Krijimi i KnowledgeLink.
 * - Normalizimi i fushave tekstuale.
 * - Validimi i vlerave bazë.
 * - Izolimi rekursiv i metadata.
 * - Immutability rekursive.
 *
 * Validimi i jashtëm dhe raportimi i gabimeve
 * mbeten përgjegjësi e KnowledgeLink Validator.
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

const ALLOWED_FIELDS = Object.freeze([
  "id",
  "sourceId",
  "targetId",
  "relationType",
  "confidence",
  "createdAt",
  "metadata",
]);

const REQUIRED_TEXT_FIELDS = Object.freeze([
  "id",
  "sourceId",
  "targetId",
  "relationType",
]);

const ISO_DATETIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

/**
 * Kontrollon nëse vlera është objekt i zakonshëm.
 */
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

/**
 * Kontrollon tekstin jo bosh dhe e normalizon me trim().
 */
function requireNonEmptyString(value, fieldName) {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new TypeError(
      `KnowledgeLink: "${fieldName}" must be a non-empty string.`,
    );
  }

  return value.trim();
}

/**
 * Kontrollon confidence.
 */
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

/**
 * Kontrollon datën ISO 8601 me zonë kohore.
 *
 * Kërkon:
 * YYYY-MM-DDTHH:mm:ss[.fraction](Z|+HH:mm|-HH:mm)
 */
function validateCreatedAt(value) {
  if (
    typeof value !== "string" ||
    !ISO_DATETIME_PATTERN.test(value)
  ) {
    throw new TypeError(
      "KnowledgeLink: createdAt must be an ISO 8601 date-time with timezone.",
    );
  }

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/,
  );

  const [
    ,
    yearText,
    monthText,
    dayText,
    hourText,
    minuteText,
    secondText,
  ] = match;

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);

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
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth[month - 1] ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    !Number.isFinite(Date.parse(value))
  ) {
    throw new TypeError(
      "KnowledgeLink: createdAt must be a valid ISO 8601 date-time.",
    );
  }

  const timezone = value.match(/([+-])(\d{2}):(\d{2})$/);

  if (
    timezone &&
    (Number(timezone[2]) > 23 ||
      Number(timezone[3]) > 59)
  ) {
    throw new TypeError(
      "KnowledgeLink: createdAt contains an invalid timezone offset.",
    );
  }

  return value;
}

/**
 * Kopjon dhe ngrin rekursivisht vlera JSON-compatible.
 *
 * Lejohen:
 * - string
 * - number finite
 * - boolean
 * - null
 * - arrays
 * - objekte të zakonshme
 *
 * Refuzohen:
 * - funksione
 * - undefined
 * - bigint
 * - symbol
 * - NaN dhe Infinity
 * - Date dhe objekte speciale
 * - referenca ciklike
 */
function cloneAndFreezeMetadataValue(value, ancestors) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(
        "KnowledgeLink: metadata cannot contain non-finite numbers.",
      );
    }

    return value;
  }

  if (typeof value !== "object") {
    throw new TypeError(
      "KnowledgeLink: metadata contains an unsupported value.",
    );
  }

  if (ancestors.has(value)) {
    throw new TypeError(
      "KnowledgeLink: metadata cannot contain circular references.",
    );
  }

  ancestors.add(value);

  try {
    if (Array.isArray(value)) {
      const ownKeys = Reflect.ownKeys(value);

      if (ownKeys.length !== value.length + 1) {
        throw new TypeError(
          "KnowledgeLink: metadata arrays cannot contain extra properties or sparse elements.",
        );
      }

      const result = [];

      for (let index = 0; index < value.length; index += 1) {
        if (
          !Object.prototype.hasOwnProperty.call(
            value,
            index,
          )
        ) {
          throw new TypeError(
            "KnowledgeLink: metadata arrays cannot contain sparse elements.",
          );
        }

        const descriptor = Object.getOwnPropertyDescriptor(
          value,
          String(index),
        );

        if (
          !descriptor ||
          !Object.prototype.hasOwnProperty.call(
            descriptor,
            "value",
          )
        ) {
          throw new TypeError(
            "KnowledgeLink: metadata cannot contain accessor properties.",
          );
        }

        result.push(
          cloneAndFreezeMetadataValue(
            descriptor.value,
            ancestors,
          ),
        );
      }

      return Object.freeze(result);
    }

    if (!isPlainObject(value)) {
      throw new TypeError(
        "KnowledgeLink: metadata must contain only plain objects and arrays.",
      );
    }

    const result = Object.create(
      Object.getPrototypeOf(value),
    );

    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") {
        throw new TypeError(
          "KnowledgeLink: metadata cannot contain symbol keys.",
        );
      }

      const descriptor = Object.getOwnPropertyDescriptor(
        value,
        key,
      );

      if (
        !descriptor ||
        !descriptor.enumerable ||
        !Object.prototype.hasOwnProperty.call(
          descriptor,
          "value",
        )
      ) {
        throw new TypeError(
          "KnowledgeLink: metadata properties must be enumerable data properties.",
        );
      }

      Object.defineProperty(result, key, {
        value: cloneAndFreezeMetadataValue(
          descriptor.value,
          ancestors,
        ),
        enumerable: true,
        writable: false,
        configurable: false,
      });
    }

    return Object.freeze(result);
  } finally {
    ancestors.delete(value);
  }
}

/**
 * Validon, kopjon dhe ngrin metadata.
 */
function validateMetadata(value) {
  if (!isPlainObject(value)) {
    throw new TypeError(
      "KnowledgeLink: metadata must be a plain object.",
    );
  }

  return cloneAndFreezeMetadataValue(
    value,
    new WeakSet(),
  );
}

/**
 * Kontrollon fushat e lejuara në input.
 */
function validateAllowedFields(input) {
  for (const key of Reflect.ownKeys(input)) {
    if (
      typeof key !== "string" ||
      !ALLOWED_FIELDS.includes(key)
    ) {
      throw new TypeError(
        `KnowledgeLink: unsupported field "${String(key)}".`,
      );
    }
  }
}

/**
 * Krijon një KnowledgeLink të normalizuar dhe të pandryshueshëm.
 */
export function createKnowledgeLink(input) {
  if (!isPlainObject(input)) {
    throw new TypeError(
      "KnowledgeLink: input must be a plain object.",
    );
  }

  validateAllowedFields(input);

  const normalized = {};

  for (const field of REQUIRED_TEXT_FIELDS) {
    normalized[field] = requireNonEmptyString(
      input[field],
      field,
    );
  }

  const {
    id,
    sourceId,
    targetId,
    relationType,
  } = normalized;

  if (sourceId === targetId) {
    throw new TypeError(
      "KnowledgeLink: sourceId and targetId must be different.",
    );
  }

  if (
    !KNOWLEDGE_LINK_RELATION_TYPES.includes(relationType)
  ) {
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
      : validateCreatedAt(input.createdAt);

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
