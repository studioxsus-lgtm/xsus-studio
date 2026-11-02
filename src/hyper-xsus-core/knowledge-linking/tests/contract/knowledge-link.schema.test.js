import { describe, it, expect } from "vitest";

import {
  KNOWLEDGE_LINK_SCHEMA_VERSION,
  KNOWLEDGE_LINK_SCHEMA,
} from "../../schemas/knowledge-link.schema.js";

describe("KnowledgeLink Schema Contract", () => {
  it("ekspozon versionin e skemës", () => {
    expect(KNOWLEDGE_LINK_SCHEMA_VERSION).toBe("1.0.0");
  });

  it("përcakton JSON Schema Draft 2020-12", () => {
    expect(KNOWLEDGE_LINK_SCHEMA.$schema).toBe(
      "https://json-schema.org/draft/2020-12/schema",
    );
  });

  it("përcakton identitetin e skemës", () => {
    expect(KNOWLEDGE_LINK_SCHEMA.$id).toBe(
      "https://xsusstudio.com/schemas/knowledge-link.schema.json",
    );
  });

  it("përcakton objektin si strukturë kryesore", () => {
    expect(KNOWLEDGE_LINK_SCHEMA.type).toBe("object");
    expect(KNOWLEDGE_LINK_SCHEMA.additionalProperties).toBe(false);
  });

  it("përcakton të gjitha fushat e detyrueshme", () => {
    expect(KNOWLEDGE_LINK_SCHEMA.required).toEqual([
      "id",
      "sourceId",
      "targetId",
      "relationType",
      "confidence",
      "createdAt",
      "metadata",
    ]);
  });

  it("përcakton kufijtë e confidence", () => {
    expect(KNOWLEDGE_LINK_SCHEMA.properties.confidence).toEqual({
      type: "number",
      minimum: 0,
      maximum: 1,
    });
  });

  it("përcakton relationType si enum", () => {
    expect(
      KNOWLEDGE_LINK_SCHEMA.properties.relationType.enum.length,
    ).toBeGreaterThan(0);
  });

  it("përcakton createdAt si date-time", () => {
    expect(
      KNOWLEDGE_LINK_SCHEMA.properties.createdAt.format,
    ).toBe("date-time");
  });

  it("lejon metadata fleksibile në formë objekti", () => {
    expect(
      KNOWLEDGE_LINK_SCHEMA.properties.metadata.type,
    ).toBe("object");

    expect(
      KNOWLEDGE_LINK_SCHEMA.properties.metadata.additionalProperties,
    ).toBe(true);
  });

  it("ruan skemën si objekt të pandryshueshëm në nivelin kryesor", () => {
    expect(Object.isFrozen(KNOWLEDGE_LINK_SCHEMA)).toBe(true);
  });
});
