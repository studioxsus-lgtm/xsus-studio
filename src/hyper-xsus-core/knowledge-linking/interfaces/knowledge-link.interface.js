
/**
 * Hyper XSUS Core
 * KnowledgeLink Interface Contract
 *
 * Version: 1.0.0
 *
 * Përcakton kontratën standarde për objektet KnowledgeLink.
 * Kjo kontratë përdoret nga modelet, validatorët, resolver-at
 * dhe komponentët e tjerë të Knowledge Linking.
 *
 * Fushat kanonike:
 * id, sourceId, targetId, relationType,
 * confidence, createdAt, metadata.
 */

export const KNOWLEDGE_LINK_INTERFACE_VERSION = "1.0.0";

export const KNOWLEDGE_LINK_REQUIRED_FIELDS = Object.freeze([
  "id",
  "sourceId",
  "targetId",
  "relationType",
  "confidence",
  "createdAt",
  "metadata",
]);

export const KNOWLEDGE_LINK_INTERFACE_METHODS = Object.freeze([
  "create",
  "validate",
  "resolve",
  "serialize",
]);

const ALLOWED_FIELDS = new Set(
  KNOWLEDGE_LINK_REQUIRED_FIELDS,
);

/**
 * Kontrollon nëse një vlerë është objekt i zakonshëm.
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
 * Kontrollon nëse objekti përmban vetëm fushat kanonike.
 *
 * Refuzon:
 * - Fusha shtesë.
 * - Çelësa Symbol.
 */
function hasOnlyAllowedFields(value) {
  const keys = Reflect.ownKeys(value);

  return keys.every(
    (key) =>
      typeof key === "string" &&
      ALLOWED_FIELDS.has(key),
  );
}

/**
 * Kontrollon nëse objekti përmban të gjitha fushat
 * e detyrueshme dhe nuk ka fusha shtesë.
 *
 * Ky kontroll verifikon vetëm strukturën e kontratës.
 * Validimi i vlerave mbetet përgjegjësi
 * e KnowledgeLink Validators.
 */
export function conformsToKnowledgeLinkInterface(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  if (!hasOnlyAllowedFields(value)) {
    return false;
  }

  return KNOWLEDGE_LINK_REQUIRED_FIELDS.every((field) =>
    Object.prototype.hasOwnProperty.call(value, field),
  );
}

/**
 * Krijon një përshkrim të pandryshueshëm të kontratës.
 */
export function getKnowledgeLinkInterfaceContract() {
  return Object.freeze({
    name: "KnowledgeLink",
    version: KNOWLEDGE_LINK_INTERFACE_VERSION,
    requiredFields: KNOWLEDGE_LINK_REQUIRED_FIELDS,
    methods: KNOWLEDGE_LINK_INTERFACE_METHODS,
  });
}
