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

describe("KnowledgeLink Engine — Advanced Integrity", () => {
  it("kombinon filtrat pa përfshirë lidhje që nuk përputhen", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLinks([
      createLink("link-1", {
        relationType: "supports",
        confidence: 0.95,
      }),
      createLink("link-2", {
        relationType: "depends_on",
        confidence: 0.9,
      }),
      createLink("link-3", {
        sourceId: "entity-c",
        relationType: "supports",
        confidence: 0.98,
      }),
    ]);

    const result = engine.search({
      sourceId: "entity-a",
      relationType: "supports",
    });

    expect(result.count).toBe(1);
    expect(result.links.map((link) => link.id)).toEqual([
      "link-1",
    ]);
  });

  it("ruan lidhjet bidirectional edhe kur kanë tipe të ndryshme", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLinks([
      createLink("forward-link", {
        sourceId: "entity-a",
        targetId: "entity-b",
        relationType: "supports",
      }),
      createLink("reverse-link", {
        sourceId: "entity-b",
        targetId: "entity-a",
        relationType: "depends_on",
      }),
      createLink("unrelated-link", {
        sourceId: "entity-c",
        targetId: "entity-d",
        relationType: "supports",
      }),
    ]);

    const result = engine.searchByStrategy({
      type: "bidirectional",
      filters: {
        sourceId: "entity-a",
        targetId: "entity-b",
      },
    });

    expect(result.count).toBe(2);
    expect(result.links.map((link) => link.id)).toEqual([
      "forward-link",
      "reverse-link",
    ]);
  });

  it("zbaton minimumConfidence si prag përfshirës", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLinks([
      createLink("below-threshold", {
        confidence: 0.79,
      }),
      createLink("at-threshold", {
        confidence: 0.8,
      }),
      createLink("above-threshold", {
        confidence: 0.95,
      }),
    ]);

    const result = engine.searchByStrategy({
      type: "direct",
      filters: {
        sourceId: "entity-a",
        targetId: "entity-b",
      },
      minimumConfidence: 0.8,
    });

    expect(result.count).toBe(2);
    expect(result.links.map((link) => link.id)).toEqual([
      "at-threshold",
      "above-threshold",
    ]);
  });

  it("zbaton limit pas filtrimit dhe ruan rendin e rezultateve", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLinks([
      createLink("first-link", { confidence: 0.95 }),
      createLink("second-link", { confidence: 0.9 }),
      createLink("third-link", { confidence: 0.85 }),
    ]);

    const result = engine.searchByStrategy({
      type: "direct",
      filters: {
        sourceId: "entity-a",
        targetId: "entity-b",
      },
      minimumConfidence: 0.8,
      limit: 2,
    });

    expect(result.count).toBe(2);
    expect(result.links.map((link) => link.id)).toEqual([
      "first-link",
      "second-link",
    ]);
  });

  it("ruan snapshot-in e rezultateve pas ndryshimeve në engine", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLink(createLink("snapshot-link"));

    const snapshot = engine.search({
      sourceId: "entity-a",
      targetId: "entity-b",
    });

    engine.removeLink("snapshot-link");

    expect(snapshot.count).toBe(1);
    expect(snapshot.links).toHaveLength(1);
    expect(snapshot.links[0].id).toBe("snapshot-link");

    expect(engine.search({
      sourceId: "entity-a",
      targetId: "entity-b",
    }).count).toBe(0);
  });

  it("mbron strukturën e rezultateve nga mutacionet e jashtme", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLink(createLink("immutable-link"));

    const result = engine.listLinks();

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.links)).toBe(true);
    expect(Object.isFrozen(result.links[0])).toBe(true);

    expect(() => {
      result.links.push(createLink("injected-link"));
    }).toThrow();

    expect(engine.getStatus().size).toBe(1);
    expect(engine.getLinkById("injected-link")).toBeNull();
  });

  it("pastron historikun dhe lejon shtimin e lidhjeve të reja", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLinks([
      createLink("old-link-1"),
      createLink("old-link-2"),
    ]);

    const clearResult = engine.clear();

    expect(clearResult.removedCount).toBe(2);
    expect(engine.listLinks().count).toBe(0);
    expect(engine.getStatus().size).toBe(0);

    engine.addLink(createLink("new-link"));

    expect(engine.listLinks().count).toBe(1);
    expect(engine.getLinkById("new-link")).not.toBeNull();
    expect(engine.getLinkById("old-link-1")).toBeNull();
  });

  it("ruan sjelljen e mbylljes së engine-it", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLink(createLink("closing-link"));

    const closeResult = engine.close();

    expect(closeResult.success).toBe(true);
    expect(closeResult.closed).toBe(true);
    expect(closeResult.alreadyClosed).toBe(false);

    expect(engine.getStatus().closed).toBe(true);
    expect(engine.getStatus().size).toBe(0);

    expect(() => engine.search()).toThrow();
    expect(() => engine.addLink(createLink("after-close"))).toThrow();

    const secondClose = engine.close();

    expect(secondClose.closed).toBe(true);
    expect(secondClose.alreadyClosed).toBe(true);
  });
});
