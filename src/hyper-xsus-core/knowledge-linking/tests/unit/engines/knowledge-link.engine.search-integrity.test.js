import { describe, it, expect } from "vitest";

import {
  createKnowledgeLinkEngine,
} from "../../../engines/knowledge-link.engine.js";

function createLink(id, overrides = {}) {
  return {
    id,
    sourceId: "entity-a",
    targetId: "entity-b",
    relationType: "supports",
    confidence: 0.9,
    createdAt: "2026-01-01T10:00:00.000Z",
    metadata: {},
    ...overrides,
  };
}

function createEngineWithLinks(links) {
  const engine = createKnowledgeLinkEngine();
  engine.addLinks(links);
  return engine;
}

describe("KnowledgeLink Engine — Search Integrity", () => {
  it("zbaton njëkohësisht sourceId dhe relationType", () => {
    const engine = createEngineWithLinks([
      createLink("search-1", {
        sourceId: "entity-a",
        targetId: "entity-b",
        relationType: "supports",
      }),
      createLink("search-2", {
        sourceId: "entity-a",
        targetId: "entity-c",
        relationType: "depends_on",
      }),
      createLink("search-3", {
        sourceId: "entity-x",
        targetId: "entity-y",
        relationType: "supports",
      }),
    ]);

    const result = engine.search({
      sourceId: "entity-a",
      relationType: "supports",
    });

    expect(result.count).toBe(1);
    expect(result.links[0].id).toBe("search-1");
  });

  it("zbaton sourceId, targetId dhe relationType së bashku", () => {
    const engine = createEngineWithLinks([
      createLink("combined-1", {
        sourceId: "entity-a",
        targetId: "entity-b",
        relationType: "supports",
      }),
      createLink("combined-2", {
        sourceId: "entity-a",
        targetId: "entity-c",
        relationType: "supports",
      }),
      createLink("combined-3", {
        sourceId: "entity-a",
        targetId: "entity-b",
        relationType: "depends_on",
      }),
    ]);

    const result = engine.search({
      sourceId: "entity-a",
      targetId: "entity-b",
      relationType: "supports",
    });

    expect(result.count).toBe(1);
    expect(result.links[0].id).toBe("combined-1");
  });

  it("kthen rezultat bosh kur filtrat nuk përputhen", () => {
    const engine = createEngineWithLinks([
      createLink("no-match-1"),
      createLink("no-match-2", {
        sourceId: "entity-c",
        targetId: "entity-d",
      }),
    ]);

    const result = engine.search({
      sourceId: "missing-entity",
      relationType: "supports",
    });

    expect(result.count).toBe(0);
    expect(result.links).toEqual([]);
  });

  it("ruan integritetin e rezultateve pas kërkimeve të njëpasnjëshme", () => {
    const engine = createEngineWithLinks([
      createLink("sequence-1"),
      createLink("sequence-2", {
        sourceId: "entity-c",
        targetId: "entity-d",
      }),
      createLink("sequence-3", {
        sourceId: "entity-a",
        targetId: "entity-c",
        relationType: "depends_on",
      }),
    ]);

    const first = engine.search({
      sourceId: "entity-a",
    });

    const second = engine.search({
      relationType: "depends_on",
    });

    const third = engine.search({
      sourceId: "entity-a",
      targetId: "entity-b",
    });

    expect(first.count).toBe(2);
    expect(second.count).toBe(1);
    expect(third.count).toBe(1);

    expect(first.links.map((link) => link.id)).toEqual([
      "sequence-1",
      "sequence-3",
    ]);

    expect(second.links[0].id).toBe("sequence-3");
    expect(third.links[0].id).toBe("sequence-1");
  });

  it("zbaton minimumConfidence dhe limit së bashku", () => {
    const engine = createEngineWithLinks([
      createLink("threshold-1", {
        confidence: 0.95,
      }),
      createLink("threshold-2", {
        confidence: 0.85,
        targetId: "entity-c",
      }),
      createLink("threshold-3", {
        confidence: 0.75,
        targetId: "entity-d",
      }),
      createLink("threshold-4", {
        confidence: 0.6,
        targetId: "entity-e",
      }),
    ]);

    const result = engine.searchByStrategy({
      type: "combined",
      filters: {
        sourceId: "entity-a",
        relationType: "supports",
      },
      minimumConfidence: 0.8,
      limit: 1,
    });

    expect(result.count).toBe(1);
    expect(result.links).toHaveLength(1);
    expect(result.links[0].id).toBe("threshold-1");
  });

  it("nuk përfshin lidhje nën minimumConfidence", () => {
    const engine = createEngineWithLinks([
      createLink("confidence-valid", {
        confidence: 0.9,
      }),
      createLink("confidence-invalid", {
        confidence: 0.4,
        targetId: "entity-c",
      }),
    ]);

    const result = engine.searchByStrategy({
      type: "direct",
      filters: {
        sourceId: "entity-a",
      },
      minimumConfidence: 0.7,
    });

    expect(result.count).toBe(1);
    expect(result.links[0].id).toBe("confidence-valid");
  });

  it("kthen rezultat bosh kur minimumConfidence nuk plotësohet", () => {
    const engine = createEngineWithLinks([
      createLink("low-confidence-1", {
        confidence: 0.3,
      }),
      createLink("low-confidence-2", {
        confidence: 0.5,
        targetId: "entity-c",
      }),
    ]);

    const result = engine.searchByStrategy({
      type: "direct",
      filters: {
        sourceId: "entity-a",
      },
      minimumConfidence: 0.8,
    });

    expect(result.count).toBe(0);
    expect(result.links).toEqual([]);
  });

  it("nuk ndryshon lidhjet e ruajtura gjatë kërkimit", () => {
    const engine = createEngineWithLinks([
      createLink("preserve-1"),
      createLink("preserve-2", {
        sourceId: "entity-c",
        targetId: "entity-d",
      }),
    ]);

    const before = engine.listLinks();

    engine.search({
      sourceId: "entity-a",
    });

    engine.searchByStrategy({
      type: "direct",
      filters: {
        sourceId: "entity-c",
      },
      minimumConfidence: 0.5,
      limit: 1,
    });

    const after = engine.listLinks();

    expect(after.count).toBe(before.count);
    expect(
      after.links.map((link) => link.id),
    ).toEqual(
      before.links.map((link) => link.id),
    );
  });

  it("ruan rendin e rezultateve pas aplikimit të limit", () => {
    const engine = createEngineWithLinks([
      createLink("order-1"),
      createLink("order-2", {
        targetId: "entity-c",
      }),
      createLink("order-3", {
        targetId: "entity-d",
      }),
    ]);

    const result = engine.searchByStrategy({
      type: "direct",
      filters: {
        sourceId: "entity-a",
      },
      limit: 2,
    });

    expect(result.count).toBe(2);
    expect(result.links.map((link) => link.id)).toEqual([
      "order-1",
      "order-2",
    ]);
  });

  it("kthen rezultate të pandryshueshme nga kërkimi", () => {
    const engine = createEngineWithLinks([
      createLink("frozen-1"),
    ]);

    const result = engine.search({
      sourceId: "entity-a",
    });

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.links)).toBe(true);
  });

  it("refuzon kërkimin pas mbylljes së engine-it", () => {
    const engine = createEngineWithLinks([
      createLink("closed-search"),
    ]);

    engine.close();

    expect(() =>
      engine.search({
        sourceId: "entity-a",
      }),
    ).toThrow("KnowledgeLink Engine is closed.");

    expect(() =>
      engine.searchByStrategy({
        type: "direct",
        filters: {
          sourceId: "entity-a",
        },
      }),
    ).toThrow("KnowledgeLink Engine is closed.");
  });
});
