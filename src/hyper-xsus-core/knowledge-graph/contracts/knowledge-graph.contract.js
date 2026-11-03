
/**
 * XSUS Hyper Core
 * Knowledge Graph Contract
 * Version: 1.0.0
 *
 * Defines the canonical structure of a Knowledge Graph.
 */

export const KNOWLEDGE_GRAPH_VERSION = "1.0.0";

export const KNOWLEDGE_GRAPH_CONTRACT = Object.freeze({
  version: KNOWLEDGE_GRAPH_VERSION,

  requiredFields: Object.freeze([
    "id",
    "version",
    "nodes",
    "links",
    "metadata",
    "createdAt",
  ]),

  allowedFields: Object.freeze([
    "id",
    "version",
    "nodes",
    "links",
    "metadata",
    "createdAt",
  ]),

  nodeRequiredFields: Object.freeze([
    "id",
  ]),

  nodeAllowedFields: Object.freeze([
    "id",
    "type",
    "label",
    "metadata",
  ]),

  rules: Object.freeze({
    uniqueNodeIds: true,
    uniqueLinkIds: true,
    linksMustReferenceExistingNodes: true,
    allowCycles: true,
    allowSelfLinks: false,
    metadataMustBeJsonCompatible: true,
    immutableKnowledgeLinks: true,
  }),

  nodeTypes: Object.freeze([
    "concept",
    "entity",
    "document",
    "topic",
    "system",
    "custom",
  ]),

  linkSource: "KnowledgeLink",

  timestampFormat: "ISO-8601",
});

export function getKnowledgeGraphContract() {
  return KNOWLEDGE_GRAPH_CONTRACT;
}

export function isKnowledgeGraphContract(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  return (
    value.version === KNOWLEDGE_GRAPH_VERSION &&
    Array.isArray(value.requiredFields) &&
    Array.isArray(value.allowedFields) &&
    Array.isArray(value.nodeRequiredFields) &&
    Array.isArray(value.nodeAllowedFields) &&
    value.rules !== null &&
    typeof value.rules === "object" &&
    !Array.isArray(value.rules)
  );
}
