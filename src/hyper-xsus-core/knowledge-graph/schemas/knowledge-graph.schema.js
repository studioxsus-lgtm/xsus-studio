
/**
 * XSUS Hyper Core
 * Knowledge Graph Schema
 * Version: 1.0.0
 *
 * Defines the canonical JSON Schema for Knowledge Graph.
 */

export const KNOWLEDGE_GRAPH_SCHEMA_VERSION = "1.0.0";

function deepFreeze(value, seen = new WeakSet()) {
  if (
    value === null ||
    typeof value !== "object" ||
    seen.has(value)
  ) {
    return value;
  }

  seen.add(value);

  for (const key of Reflect.ownKeys(value)) {
    deepFreeze(value[key], seen);
  }

  return Object.freeze(value);
}

export const KNOWLEDGE_GRAPH_SCHEMA = deepFreeze({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://xsusstudio.com/schemas/knowledge-graph-1.0.0.json",
  title: "XSUS Knowledge Graph",
  description:
    "Canonical structure for XSUS Hyper Core Knowledge Graph.",
  type: "object",
  additionalProperties: false,

  required: [
    "id",
    "version",
    "nodes",
    "links",
    "metadata",
    "createdAt",
  ],

  properties: {
    id: {
      type: "string",
      minLength: 1,
    },

    version: {
      const: KNOWLEDGE_GRAPH_SCHEMA_VERSION,
    },

    nodes: {
      type: "array",
      items: {
        $ref: "#/$defs/node",
      },
    },

    links: {
      type: "array",
      items: {
        $ref: "#/$defs/link",
      },
    },

    metadata: {
      type: "object",
      additionalProperties: {
        $ref: "#/$defs/jsonValue",
      },
    },

    createdAt: {
      type: "string",
      format: "date-time",
    },
  },

  $defs: {
    jsonValue: {
      anyOf: [
        { type: "null" },
        { type: "string" },
        { type: "boolean" },
        { type: "number" },
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
    },

    node: {
      type: "object",
      additionalProperties: false,
      required: ["id"],

      properties: {
        id: {
          type: "string",
          minLength: 1,
        },

        type: {
          type: "string",
          enum: [
            "concept",
            "entity",
            "document",
            "topic",
            "system",
            "custom",
          ],
        },

        label: {
          type: "string",
          minLength: 1,
        },

        metadata: {
          type: "object",
          additionalProperties: {
            $ref: "#/$defs/jsonValue",
          },
        },
      },
    },

    link: {
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
          minLength: 1,
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
    },
  },
});

export function getKnowledgeGraphSchema() {
  return KNOWLEDGE_GRAPH_SCHEMA;
}

export function isKnowledgeGraphSchema(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    value.$schema === KNOWLEDGE_GRAPH_SCHEMA.$schema &&
    value.$id === KNOWLEDGE_GRAPH_SCHEMA.$id &&
    value.type === "object" &&
    value.additionalProperties === false
  );
}
