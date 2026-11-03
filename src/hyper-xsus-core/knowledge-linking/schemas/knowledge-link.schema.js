
/**
 * Hyper XSUS Core
 * KnowledgeLink Data Schema
 *
 * Version: 1.0.0
 *
 * Përcakton strukturën standarde të të dhënave
 * për marrëdhëniet ndërmjet elementeve të dijes.
 *
 * Kontrata:
 * - Shtatë fusha kanonike.
 * - Pa fusha shtesë.
 * - Dhjetë relation types të lejuara.
 * - Confidence nga 0 deri në 1.
 * - createdAt në format date-time RFC3339.
 * - Metadata JSON-compatible.
 */

import {
  KNOWLEDGE_LINK_RELATION_TYPES,
} from "../models/knowledge-link.js";

export const KNOWLEDGE_LINK_SCHEMA_VERSION = "1.0.0";

/**
 * Përfaqëson çdo vlerë JSON-compatible.
 *
 * Lejohen:
 * - string
 * - number
 * - boolean
 * - null
 * - arrays
 * - objects
 */
const JSON_VALUE_SCHEMA = {
  anyOf: [
    {
      type: "string",
    },
    {
      type: "number",
    },
    {
      type: "boolean",
    },
    {
      type: "null",
    },
    {
      type: "array",
      items: {
        $ref: "#/$defs/jsonValue",
      },
    },
    {
      type: "object",
      additionalProperties: {
        $ref: "#/$defs/jsonValue",
      },
    },
  ],
};

/**
 * Ngrin rekursivisht strukturën e Schema.
 */
function deepFreeze(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Object.isFrozen(value)
  ) {
    return value;
  }

  for (const key of Reflect.ownKeys(value)) {
    deepFreeze(value[key]);
  }

  return Object.freeze(value);
}

const schema = {
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
      additionalProperties: {
        $ref: "#/$defs/jsonValue",
      },
    },
  },

  $defs: {
    jsonValue: JSON_VALUE_SCHEMA,
  },
};

export const KNOWLEDGE_LINK_SCHEMA = deepFreeze(schema);
