
import {
  describe,
  it,
  expect,
} from "vitest";

import {
  KNOWLEDGE_GRAPH_SCHEMA,
  KNOWLEDGE_GRAPH_SCHEMA_VERSION,
  getKnowledgeGraphSchema,
  isKnowledgeGraphSchema,
} from "../../schemas/knowledge-graph.schema.js";

describe("Knowledge Graph Schema", () => {
  it("exposes the correct version", () => {
    expect(KNOWLEDGE_GRAPH_SCHEMA_VERSION).toBe("1.0.0");
  });

  it("returns the canonical schema", () => {
    expect(getKnowledgeGraphSchema()).toBe(
      KNOWLEDGE_GRAPH_SCHEMA,
    );
  });

  it("uses JSON Schema draft 2020-12", () => {
    expect(KNOWLEDGE_GRAPH_SCHEMA.$schema).toBe(
      "https://json-schema.org/draft/2020-12/schema",
    );
  });

  it("rejects additional graph properties", () => {
    expect(
      KNOWLEDGE_GRAPH_SCHEMA.additionalProperties,
    ).toBe(false);
  });

  it("requires all canonical graph fields", () => {
    expect(KNOWLEDGE_GRAPH_SCHEMA.required).toEqual([
      "id",
      "version",
      "nodes",
      "links",
      "metadata",
      "createdAt",
    ]);
  });

  it("defines recursive JSON-compatible metadata", () => {
    expect(
      KNOWLEDGE_GRAPH_SCHEMA.$defs.jsonValue,
    ).toBeDefined();
  });

  it("defines the canonical node structure", () => {
    expect(
      KNOWLEDGE_GRAPH_SCHEMA.$defs.node.required,
    ).toEqual(["id"]);

    expect(
      KNOWLEDGE_GRAPH_SCHEMA.$defs.node.additionalProperties,
    ).toBe(false);
  });

  it("defines the canonical KnowledgeLink structure", () => {
    expect(
      KNOWLEDGE_GRAPH_SCHEMA.$defs.link.required,
    ).toContain("sourceId");

    expect(
      KNOWLEDGE_GRAPH_SCHEMA.$defs.link.required,
    ).toContain("targetId");
  });

  it("deep freezes the schema", () => {
    expect(
      Object.isFrozen(KNOWLEDGE_GRAPH_SCHEMA),
    ).toBe(true);

    expect(
      Object.isFrozen(KNOWLEDGE_GRAPH_SCHEMA.properties),
    ).toBe(true);

    expect(
      Object.isFrozen(KNOWLEDGE_GRAPH_SCHEMA.$defs.node),
    ).toBe(true);
  });

  it("recognizes the canonical schema", () => {
    expect(
      isKnowledgeGraphSchema(KNOWLEDGE_GRAPH_SCHEMA),
    ).toBe(true);
  });

  it("rejects invalid schemas", () => {
    expect(isKnowledgeGraphSchema(null)).toBe(false);
    expect(isKnowledgeGraphSchema([])).toBe(false);
    expect(isKnowledgeGraphSchema({})).toBe(false);
  });
});
