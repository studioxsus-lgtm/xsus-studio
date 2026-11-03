/**
 * Knowledge Graph Validator
 * XSUS Hyper Core
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Validimi strukturor i Knowledge Graph.
 * - Kontrolli i nodes dhe links.
 * - Kontrolli i referencave.
 * - Validimi i metadata JSON-compatible.
 * - Ruajtja e integritetit të Graph-it.
 */

export const KNOWLEDGE_GRAPH_VALIDATOR_VERSION = "1.0.0";

const GRAPH_FIELDS = new Set([
  "id",
  "version",
  "nodes",
  "links",
  "metadata",
  "createdAt"
]);

const NODE_FIELDS = new Set([
  "id",
  "type",
  "label",
  "metadata"
]);

const LINK_FIELDS = new Set([
  "id",
  "sourceId",
  "targetId",
  "relationType",
  "confidence",
  "createdAt",
  "metadata"
]);

const NODE_TYPES = new Set([
  "concept",
  "entity",
  "document",
  "topic",
  "system",
  "custom"
]);

const RELATION_TYPES = new Set([
  "supports",
  "depends_on",
  "contains",
  "part_of",
  "causes",
  "derived_from",
  "related_to",
  "contradicts",
  "implements",
  "specializes"
]);

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function hasOnlyFields(value, allowedFields) {
  return Reflect.ownKeys(value).every(
    (key) =>
      typeof key === "string" &&
      allowedFields.has(key)
  );
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isNonEmptyString(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function isValidDateTime(value) {
  if (typeof value !== "string") {
    return false;
  }

  const pattern =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

  if (!pattern.test(value)) {
    return false;
  }

  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  const datePart = value.slice(0, 10);
  const [year, month, day] = datePart.split("-").map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return false;
  }

  const timezone = value.match(/([+-])(\d{2}):(\d{2})$/);

  if (timezone) {
    const hours = Number(timezone[2]);
    const minutes = Number(timezone[3]);

    if (
      hours > 23 ||
      minutes > 59
    ) {
      return false;
    }
  }

  return true;
}

function isJsonCompatible(value, ancestors = new WeakSet()) {
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

  if (ancestors.has(value)) {
    return false;
  }

  if (!Array.isArray(value) && !isPlainObject(value)) {
    return false;
  }

  ancestors.add(value);

  let valid = true;

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!hasOwn(value, index)) {
        valid = false;
        break;
      }

      const descriptor = Object.getOwnPropertyDescriptor(
        value,
        String(index)
      );

      if (
        !descriptor ||
        !hasOwn(descriptor, "value") ||
        !isJsonCompatible(descriptor.value, ancestors)
      ) {
        valid = false;
        break;
      }
    }

    if (Reflect.ownKeys(value).some((key) => {
      if (key === "length") {
        return false;
      }

      if (typeof key !== "string") {
        return true;
      }

      const index = Number(key);

      return (
        !Number.isInteger(index) ||
        index < 0 ||
        String(index) !== key ||
        index >= value.length
      );
    })) {
      valid = false;
    }
  } else {
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") {
        valid = false;
        break;
      }

      const descriptor = Object.getOwnPropertyDescriptor(
        value,
        key
      );

      if (
        !descriptor ||
        !hasOwn(descriptor, "value") ||
        !isJsonCompatible(descriptor.value, ancestors)
      ) {
        valid = false;
        break;
      }
    }
  }

  ancestors.delete(value);

  return valid;
}

function validateMetadata(metadata, fieldName, errors) {
  if (!isPlainObject(metadata)) {
    errors.push(`${fieldName} must be a plain object.`);
    return;
  }

  if (!isJsonCompatible(metadata)) {
    errors.push(
      `${fieldName} must contain only JSON-compatible values.`
    );
  }
}

function validateNode(node, index, errors) {
  const prefix = `nodes[${index}]`;

  if (!isPlainObject(node)) {
    errors.push(`${prefix} must be a plain object.`);
    return;
  }

  if (!hasOnlyFields(node, NODE_FIELDS)) {
    errors.push(`${prefix} contains unsupported fields.`);
  }

  if (!isNonEmptyString(node.id)) {
    errors.push(`${prefix}.id must be a non-empty string.`);
  }

  if (
    hasOwn(node, "type") &&
    !NODE_TYPES.has(node.type)
  ) {
    errors.push(`${prefix}.type is invalid.`);
  }

  if (
    hasOwn(node, "label") &&
    !isNonEmptyString(node.label)
  ) {
    errors.push(`${prefix}.label must be a non-empty string.`);
  }

  if (hasOwn(node, "metadata")) {
    validateMetadata(
      node.metadata,
      `${prefix}.metadata`,
      errors
    );
  }
}

function validateLink(link, index, errors) {
  const prefix = `links[${index}]`;

  if (!isPlainObject(link)) {
    errors.push(`${prefix} must be a plain object.`);
    return;
  }

  if (!hasOnlyFields(link, LINK_FIELDS)) {
    errors.push(`${prefix} contains unsupported fields.`);
  }

  const requiredFields = [
    "id",
    "sourceId",
    "targetId",
    "relationType",
    "confidence",
    "createdAt",
    "metadata"
  ];

  for (const field of requiredFields) {
    if (!hasOwn(link, field)) {
      errors.push(`${prefix}.${field} is required.`);
    }
  }

  for (const field of [
    "id",
    "sourceId",
    "targetId"
  ]) {
    if (!isNonEmptyString(link[field])) {
      errors.push(
        `${prefix}.${field} must be a non-empty string.`
      );
    }
  }

  if (
    isNonEmptyString(link.sourceId) &&
    isNonEmptyString(link.targetId) &&
    link.sourceId.trim() === link.targetId.trim()
  ) {
    errors.push(`${prefix} cannot contain a self-link.`);
  }

  if (!RELATION_TYPES.has(link.relationType)) {
    errors.push(`${prefix}.relationType is invalid.`);
  }

  if (
    typeof link.confidence !== "number" ||
    !Number.isFinite(link.confidence) ||
    link.confidence < 0 ||
    link.confidence > 1
  ) {
    errors.push(
      `${prefix}.confidence must be a finite number between 0 and 1.`
    );
  }

  if (!isValidDateTime(link.createdAt)) {
    errors.push(`${prefix}.createdAt must be a valid ISO 8601 date.`);
  }

  if (hasOwn(link, "metadata")) {
    validateMetadata(
      link.metadata,
      `${prefix}.metadata`,
      errors
    );
  }
}

function validateUniqueIds(items, fieldName, collectionName, errors) {
  const seen = new Set();

  items.forEach((item, index) => {
    if (!isNonEmptyString(item?.[fieldName])) {
      return;
    }

    const id = item[fieldName].trim();

    if (seen.has(id)) {
      errors.push(
        `${collectionName}[${index}].${fieldName} must be unique.`
      );
    }

    seen.add(id);
  });
}

function validateLinkReferences(nodes, links, errors) {
  const nodeIds = new Set(
    nodes
      .filter((node) => isNonEmptyString(node?.id))
      .map((node) => node.id.trim())
  );

  links.forEach((link, index) => {
    if (!isPlainObject(link)) {
      return;
    }

    if (
      isNonEmptyString(link.sourceId) &&
      !nodeIds.has(link.sourceId.trim())
    ) {
      errors.push(
        `links[${index}].sourceId references a missing node.`
      );
    }

    if (
      isNonEmptyString(link.targetId) &&
      !nodeIds.has(link.targetId.trim())
    ) {
      errors.push(
        `links[${index}].targetId references a missing node.`
      );
    }
  });
}

export function validateKnowledgeGraph(graph) {
  const errors = [];

  if (!isPlainObject(graph)) {
    return {
      valid: false,
      errors: ["Knowledge Graph must be a plain object."]
    };
  }

  if (!hasOnlyFields(graph, GRAPH_FIELDS)) {
    errors.push("Knowledge Graph contains unsupported fields.");
  }

  const requiredFields = [
    "id",
    "version",
    "nodes",
    "links",
    "metadata",
    "createdAt"
  ];

  for (const field of requiredFields) {
    if (!hasOwn(graph, field)) {
      errors.push(`${field} is required.`);
    }
  }

  if (!isNonEmptyString(graph.id)) {
    errors.push("id must be a non-empty string.");
  }

  if (graph.version !== "1.0.0") {
    errors.push("Unsupported Knowledge Graph version.");
  }

  if (!Array.isArray(graph.nodes)) {
    errors.push("nodes must be an array.");
  }

  if (!Array.isArray(graph.links)) {
    errors.push("links must be an array.");
  }

  if (Array.isArray(graph.nodes)) {
    graph.nodes.forEach((node, index) => {
      validateNode(node, index, errors);
    });

    validateUniqueIds(
      graph.nodes,
      "id",
      "nodes",
      errors
    );
  }

  if (Array.isArray(graph.links)) {
    graph.links.forEach((link, index) => {
      validateLink(link, index, errors);
    });

    validateUniqueIds(
      graph.links,
      "id",
      "links",
      errors
    );
  }

  if (
    Array.isArray(graph.nodes) &&
    Array.isArray(graph.links)
  ) {
    validateLinkReferences(
      graph.nodes,
      graph.links,
      errors
    );
  }

  if (hasOwn(graph, "metadata")) {
    validateMetadata(
      graph.metadata,
      "metadata",
      errors
    );
  }

  if (!isValidDateTime(graph.createdAt)) {
    errors.push(
      "createdAt must be a valid ISO 8601 date."
    );
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function isValidKnowledgeGraph(graph) {
  return validateKnowledgeGraph(graph).valid;
}

export function getKnowledgeGraphValidationErrors(graph) {
  return validateKnowledgeGraph(graph).errors;
}
