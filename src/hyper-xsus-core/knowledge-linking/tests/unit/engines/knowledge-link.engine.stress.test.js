import { describe, it, expect } from "vitest";

import {
  createKnowledgeLinkEngine,
} from "../../../engines/knowledge-link.engine.js";

function createLink(id, overrides = {}) {
  return {
    id,
    sourceId: `entity-${Number(id.split("-")[1]) % 100}`,
    targetId: `target-${Number(id.split("-")[1]) % 50}`,
    relationType: "supports",
    confidence: 0.9,
    createdAt: "2026-01-01T10:00:00.000Z",
    metadata: {},
    ...overrides,
  };
}

describe("KnowledgeLink Engine — Stress & Scalability Integrity", () => {
  it("ruan integritetin gjatë shtimit të 5000 lidhjeve", () => {
    const engine = createKnowledgeLinkEngine();

    const links = Array.from(
      { length: 5000 },
      (_, index) => createLink(`link-${index}`),
    );

    const result = engine.addLinks(links);

    expect(result.count).toBe(5000);
    expect(engine.getStatus().size).toBe(5000);
    expect(engine.listLinks().count).toBe(5000);
  });

  it("ruan identitetin dhe rendin e 5000 lidhjeve", () => {
    const engine = createKnowledgeLinkEngine();

    const links = Array.from(
      { length: 5000 },
      (_, index) => createLink(`link-${index}`),
    );

    engine.addLinks(links);

    const result = engine.listLinks();
    const ids = result.links.map((link) => link.id);

    expect(ids).toHaveLength(5000);
    expect(ids[0]).toBe("link-0");
    expect(ids[2499]).toBe("link-2499");
    expect(ids[4999]).toBe("link-4999");

    expect(new Set(ids).size).toBe(5000);
  });

  it("kryen kërkime të përsëritura pa ndryshuar koleksionin", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLinks(
      Array.from(
        { length: 2000 },
        (_, index) => createLink(`link-${index}`),
      ),
    );

    for (let index = 0; index < 100; index += 1) {
      const result = engine.search({
        relationType: "supports",
      });

      expect(result.count).toBe(2000);
    }

    expect(engine.getStatus().size).toBe(2000);
  });

  it("ruan saktësinë e filtrave në një koleksion të madh", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLinks(
      Array.from({ length: 3000 }, (_, index) =>
        createLink(`link-${index}`, {
          sourceId: index % 2 === 0
            ? "entity-special"
            : "entity-other",
          relationType: index % 3 === 0
            ? "depends_on"
            : "supports",
          confidence: index % 10 === 0 ? 0.99 : 0.8,
        }),
      ),
    );

    const result = engine.search({
      sourceId: "entity-special",
      relationType: "depends_on",
    });

    expect(result.links.length).toBe(500);

    expect(
      result.links.every(
        (link) =>
          link.sourceId === "entity-special" &&
          link.relationType === "depends_on",
      ),
    ).toBe(true);
  });

  it("zbaton minimumConfidence dhe limit në koleksion të madh", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLinks(
      Array.from({ length: 1000 }, (_, index) =>
        createLink(`link-${index}`, {
          sourceId: "entity-stress",
          confidence: index / 1000,
        }),
      ),
    );

    const result = engine.searchByStrategy({
      type: "direct",
      filters: {
        sourceId: "entity-stress",
      },
      minimumConfidence: 0.8,
      limit: 25,
    });

    expect(result.count).toBe(25);

    expect(
      result.links.every(
        (link) =>
          link.sourceId === "entity-stress" &&
          link.confidence >= 0.8,
      ),
    ).toBe(true);

    expect(
      result.links.map((link) => link.id),
    ).toEqual(
      Array.from(
        { length: 25 },
        (_, index) => `link-${800 + index}`,
      ),
    );
  });

  it("ruan integritetin pas shtimeve dhe fshirjeve të përsëritura", () => {
    const engine = createKnowledgeLinkEngine();

    for (let batch = 0; batch < 20; batch += 1) {
      engine.addLinks(
        Array.from({ length: 50 }, (_, index) =>
          createLink(`batch-${batch}-${index}`),
        ),
      );
    }

    expect(engine.getStatus().size).toBe(1000);

    for (let batch = 0; batch < 10; batch += 1) {
      for (let index = 0; index < 50; index += 1) {
        expect(
          engine.removeLink(`batch-${batch}-${index}`),
        ).toBe(true);
      }
    }

    expect(engine.getStatus().size).toBe(500);
    expect(engine.listLinks().count).toBe(500);
  });

  it("ruan gjendjen pas pastrimit dhe ringarkimit të koleksionit", () => {
    const engine = createKnowledgeLinkEngine();

    const firstBatch = Array.from(
      { length: 1000 },
      (_, index) => createLink(`first-${index}`),
    );

    engine.addLinks(firstBatch);

    const clearResult = engine.clear();

    expect(clearResult.removedCount).toBe(1000);
    expect(engine.getStatus().size).toBe(0);

    const secondBatch = Array.from(
      { length: 1500 },
      (_, index) => createLink(`second-${index}`),
    );

    engine.addLinks(secondBatch);

    expect(engine.getStatus().size).toBe(1500);
    expect(engine.listLinks().count).toBe(1500);
    expect(engine.getLinkById("second-1499")).not.toBeNull();
    expect(engine.getLinkById("first-0")).toBeNull();
  });

  it("ruan stabilitetin gjatë cikleve të shumta të operacioneve", () => {
    const engine = createKnowledgeLinkEngine();

    for (let cycle = 0; cycle < 25; cycle += 1) {
      const id = `cycle-${cycle}`;

      engine.addLink(createLink(id));

      expect(engine.getLinkById(id)).not.toBeNull();

      const searchResult = engine.search({
        sourceId: `entity-${cycle % 100}`,
      });

      expect(searchResult.count).toBeGreaterThanOrEqual(1);

      expect(engine.removeLink(id)).toBe(true);
      expect(engine.getLinkById(id)).toBeNull();
    }

    expect(engine.getStatus().size).toBe(0);
    expect(engine.getStatus().closed).toBe(false);
  });
});
