
/**
 * XSUS Hyper Core
 * Knowledge Graph Interface
 * Version: 1.0.0
 *
 * Defines the structural interface of a Knowledge Graph.
 */

export const KNOWLEDGE_GRAPH_INTERFACE_VERSION = "1.0.0";

export const KNOWLEDGE_GRAPH_INTERFACE_FIELDS =
  Object.freeze([
    "id",
    "version",
    "nodes",
    "links",
    "metadata",
    "createdAt",
  ]);

export const KNOWLEDGE_GRAPH_NODE_INTERFACE_FIELDS =
  Object.freeze([
    "id",
    "type",
    "label",
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

function hasOnlyAllowedFields(value, allowedFields) {
  return Reflect.ownKeys(value).every(
    (key) =>
      typeof key === "string" &&
      allowedFields.includes(key),
  );
}

function hasRequiredFields(value, requiredFields) {
  return requiredFields.every(
    (field) =>
      Object.prototype.hasOwnProperty.call(value, field),
  );
}

export function isKnowledgeGraphNodeInterface(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  if (
    !hasOnlyAllowedFields(
      value,
      KNOWLEDGE_GRAPH_NODE_INTERFACE_FIELDS,
    )
  ) {
    return false;
  }

  if (!hasRequiredFields(value, ["id"])) {
    return false;
  }

  return true;
}

export function isKnowledgeGraphInterface(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  if (
    !hasOnlyAllowedFields(
      value,
      KNOWLEDGE_GRAPH_INTERFACE_FIELDS,
    )
  ) {
    return false;
  }

  if (
    !hasRequiredFields(
      value,
      KNOWLEDGE_GRAPH_INTERFACE_FIELDS,
    )
  ) {
    return false;
  }

  return true;
}
