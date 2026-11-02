/**
 * Hyper XSUS Core
 * KnowledgeLink Data Schema
 *
 * Version: 1.0.0
 *
 * Përcakton strukturën standarde të të dhënave
 * për marrëdhëniet ndërmjet elementeve të dijes.
 */

import {
  KNOWLEDGE_LINK_RELATION_TYPES,
} from "../models/knowledge-link.js";

export const KNOWLEDGE_LINK_SCHEMA_VERSION = "1.0.0";

export const KNOWLEDGE_LINK_SCHEMA = Object.freeze({
  $schema: "https://json-schema.org/draft/2020-12/schema",

  $id: "https://xsusstudio.com/schemas/knowledge-link.schema.json",

  title: "KnowledgeLink",

  description:
    "Standard data structure for relationships between knowledge entities in Hyper XSUS Core.",

  type: "object",

  additionalProperties: false,

  required: [
    "id",
    "sourceId",
    "targetId",
    "relationType",
    "confidence",
    "createdAt",
    "metadata",
  ],

  properties: {
    id: {
      type: "string",
      minLength: 1,
    },

    sourceId: {
      type: "string",
      minLength: 1,
    },

    targetId: {
      type: "string",
      minLength: 1,
    },

    relationType: {
      type: "string",
      enum: [...KNOWLEDGE_LINK_RELATION_TYPES],
    },

    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },

    createdAt: {
      type: "string",
      format: "date-time",
    },

    metadata: {
      type: "object",
      additionalProperties: true,
    },
  },
});
