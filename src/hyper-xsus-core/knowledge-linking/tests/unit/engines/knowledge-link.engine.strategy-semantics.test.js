import { describe, it, expect } from "vitest";

import {
  createKnowledgeLinkEngine,
} from "../../../engines/knowledge-link.engine.js";

function createLink(id, sourceId, targetId, relationType = "supports") {
  return {
    id,
    sourceId,
    targetId,
    relationType,
    confidence: 0.9,
    createdAt: "2026-01-01T10:00:00.000Z",
    metadata: {},
  };
}

function createEngine() {
  const engine = createKnowledgeLinkEngine();

  engine.addLinks([
    createLink("direct-ab", "entity-a", "entity-b"),
    createLink("reverse-ba", "entity-b", "entity-a"),
    createLink("unrelated-cd", "entity-c", "entity-d"),
    createLink("direct-ab-2", "entity-a", "entity-b", "depends_on"),
  ]);

  return engine;
}

describe("KnowledgeLink Engine — Strategy Semantics", () => {
  it("direct kërkon lidhjen në drejtimin e përcaktuar", () => {
    const engine = createEngine();

    const result = engine.searchByStrategy({
      type: "direct",
      filters: {
        sourceId: "entity-a",
        targetId: "entity-b",
      },
    });

    expect(result.links.map((link) => link.id)).toEqual([
      "direct-ab",
      "direct-ab-2",
    ]);
  });

  it("reverse kërkon lidhjen në drejtimin e kundërt", () => {
    const engine = createEngine();

    const result = engine.searchByStrategy({
      type: "reverse",
      filters: {
        sourceId: "entity-a",
        targetId: "entity-b",
      },
    });

    expect(result.links.map((link) => link.id)).toEqual([
      "reverse-ba",
    ]);
  });

  it("bidirectional përfshin të dy drejtimet", () => {
    const engine = createEngine();

    const result = engine.searchByStrategy({
      type: "bidirectional",
      filters: {
        sourceId: "entity-a",
        targetId: "entity-b",
      },
    });

    expect(result.links.map((link) => link.id)).toEqual([
      "direct-ab",
      "reverse-ba",
      "direct-ab-2",
    ]);
  });

  it("relation kufizon rezultatet sipas tipit të marrëdhënies", () => {
    const engine = createEngine();

    const result = engine.searchByStrategy({
      type: "relation",
      filters: {
        relationType: "depends_on",
      },
    });

    expect(result.count).toBe(1);
    expect(result.links[0].id).toBe("direct-ab-2");
  });

  it("entity gjen lidhjet ku entiteti është burim ose objektiv", () => {
    const engine = createEngine();

    const result = engine.searchByStrategy({
      type: "entity",
      filters: {
        entityId: "entity-a",
      },
    });

    expect(result.links.map((link) => link.id)).toEqual([
      "direct-ab",
      "reverse-ba",
      "direct-ab-2",
    ]);
  });
});
