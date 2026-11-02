/**
 * Hyper XSUS Core
 * KnowledgeLink Interface Contract
 *
 * Version: 1.0.0
 *
 * Përcakton kontratën standarde për objektet KnowledgeLink.
 * Kjo kontratë përdoret nga modelet, validatorët, resolver-at
 * dhe komponentët e tjerë të Knowledge Linking.
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
 * Kontrollon strukturën bazë të një KnowledgeLink.
 *
 * Ky kontroll verifikon kontratën strukturore.
 * Rregullat e hollësishme të validimit mbeten përgjegjësi
 * e KnowledgeLink Validators.
 */
export function conformsToKnowledgeLinkInterface(value) {
  if (!isPlainObject(value)) {
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
