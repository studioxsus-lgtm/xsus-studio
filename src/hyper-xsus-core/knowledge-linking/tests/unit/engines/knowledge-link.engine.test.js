import { describe, it, expect } from "vitest";

import {
  KNOWLEDGE_LINK_ENGINE_VERSION,
  createKnowledgeLinkEngine,
} from "../../../engines/knowledge-link.engine.js";

function createLink(id, overrides = {}) {
  return {
    id,
    sourceId: "entity-a",
    targetId: "entity-b",
    relationType: "supports",
    confidence: 0.9,
    createdAt: "2026-01-01T00:00:00.000Z",
    metadata: {},
    ...overrides,
  };
}

describe("KnowledgeLink Engine", () => {
  it("raporton versionin e engine-it", () => {
    expect(KNOWLEDGE_LINK_ENGINE_VERSION).toBe("1.0.0");
  });

  it("krijon engine me status fillestar", () => {
    const engine = createKnowledgeLinkEngine();

    expect(engine.getStatus()).toEqual({
      version: "1.0.0",
      closed: false,
      size: 0,
    });
  });

  it("refuzon options të pavlefshme", () => {
    expect(() => createKnowledgeLinkEngine(null)).toThrow();
    expect(() => createKnowledgeLinkEngine([])).toThrow();
  });

  it("shton dhe rikthen një lidhje", () => {
    const engine = createKnowledgeLinkEngine();

    const link = engine.addLink(createLink("link-1"));

    expect(link.id).toBe("link-1");
    expect(engine.getLinkById("link-1")).toEqual(link);
    expect(engine.getStatus().size).toBe(1);
  });

  it("refuzon shtimin e një lidhjeje me të dhëna të pavlefshme", () => {
    const engine = createKnowledgeLinkEngine();

    expect(() =>
      engine.addLink({
        id: "link-1",
        sourceId: "entity-a",
        targetId: "entity-a",
        relationType: "supports",
      }),
    ).toThrow();

    expect(engine.getStatus().size).toBe(0);
  });

  it("refuzon ID të përsëritur", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLink(createLink("link-1"));

    expect(() =>
      engine.addLink(createLink("link-1")),
    ).toThrow();

    expect(engine.getStatus().size).toBe(1);
  });

  it("shton një grup lidhjesh në mënyrë atomike", () => {
    const engine = createKnowledgeLinkEngine();

    const result = engine.addLinks([
      createLink("link-1"),
      createLink("link-2", {
        sourceId: "entity-b",
        targetId: "entity-c",
      }),
    ]);

    expect(result.count).toBe(2);
    expect(engine.getStatus().size).toBe(2);
  });

  it("refuzon grupin kur një lidhje është e pavlefshme pa mutacion", () => {
    const engine = createKnowledgeLinkEngine();

    expect(() =>
      engine.addLinks([
        createLink("link-1"),
        createLink("link-2", {
          sourceId: "entity-a",
          targetId: "entity-a",
        }),
      ]),
    ).toThrow();

    expect(engine.getStatus().size).toBe(0);
  });

  it("refuzon ID të përsëritura brenda grupit", () => {
    const engine = createKnowledgeLinkEngine();

    expect(() =>
      engine.addLinks([
        createLink("link-1"),
        createLink("link-1"),
      ]),
    ).toThrow();

    expect(engine.getStatus().size).toBe(0);
  });

  it("refuzon ID që ekziston para shtimit të grupit", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLink(createLink("link-1"));

    expect(() =>
      engine.addLinks([
        createLink("link-2"),
        createLink("link-1"),
      ]),
    ).toThrow();

    expect(engine.getStatus().size).toBe(1);
    expect(engine.getLinkById("link-2")).toBeNull();
  });

  it("refuzon input që nuk është array në addLinks", () => {
    const engine = createKnowledgeLinkEngine();

    expect(() => engine.addLinks(null)).toThrow();
    expect(engine.getStatus().size).toBe(0);
  });

  it("liston të gjitha lidhjet", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLinks([
      createLink("link-1"),
      createLink("link-2"),
    ]);

    const result = engine.listLinks();

    expect(result.count).toBe(2);
    expect(result.links.map((link) => link.id)).toEqual([
      "link-1",
      "link-2",
    ]);
  });

  it("kërkon lidhjet sipas filtrave", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLinks([
      createLink("link-1"),
      createLink("link-2", {
        sourceId: "entity-b",
        targetId: "entity-c",
      }),
    ]);

    const result = engine.search({
      sourceId: "entity-a",
    });

    expect(result.count).toBe(1);
    expect(result.links[0].id).toBe("link-1");
  });

  it("kërkon lidhjet përmes strategjisë", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLinks([
      createLink("link-1", { confidence: 0.95 }),
      createLink("link-2", { confidence: 0.6 }),
      createLink("link-3", { confidence: 0.8 }),
    ]);

    const result = engine.searchByStrategy({
      type: "direct",
      filters: { sourceId: "entity-a" },
      minimumConfidence: 0.8,
      limit: 1,
    });

    expect(result.count).toBe(1);
    expect(result.links[0].id).toBe("link-1");
  });

  it("refuzon strategji të pavlefshme", () => {
    const engine = createKnowledgeLinkEngine();

    expect(() =>
      engine.searchByStrategy({
        type: "unknown",
      }),
    ).toThrow();
  });

  it("rikthen null për një ID që nuk ekziston", () => {
    const engine = createKnowledgeLinkEngine();

    expect(engine.getLinkById("missing")).toBeNull();
  });

  it("refuzon ID kërkimi bosh", () => {
    const engine = createKnowledgeLinkEngine();

    expect(() => engine.getLinkById(" ")).toThrow();
  });

  it("fshin një lidhje sipas ID-së", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLink(createLink("link-1"));

    expect(engine.removeLink("link-1")).toBe(true);
    expect(engine.getLinkById("link-1")).toBeNull();
    expect(engine.getStatus().size).toBe(0);
  });

  it("kthen false kur ID për fshirje nuk ekziston", () => {
    const engine = createKnowledgeLinkEngine();

    expect(engine.removeLink("missing")).toBe(false);
  });

  it("pastron të gjitha lidhjet", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLinks([
      createLink("link-1"),
      createLink("link-2"),
    ]);

    expect(engine.clear()).toEqual({
      removedCount: 2,
    });

    expect(engine.getStatus().size).toBe(0);
  });

  it("mbyll engine dhe pastron memorien", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLink(createLink("link-1"));

    expect(engine.close()).toEqual({
      success: true,
      closed: true,
      alreadyClosed: false,
    });

    expect(engine.getStatus()).toEqual({
      version: "1.0.0",
      closed: true,
      size: 0,
    });
  });

  it("e bën close idempotent", () => {
    const engine = createKnowledgeLinkEngine();

    engine.close();

    expect(engine.close()).toEqual({
      success: true,
      closed: true,
      alreadyClosed: true,
    });
  });

  it("refuzon operacionet pas mbylljes", () => {
    const engine = createKnowledgeLinkEngine();

    engine.close();

    expect(() => engine.addLink(createLink("link-1"))).toThrow();
    expect(() => engine.addLinks([])).toThrow();
    expect(() => engine.getLinkById("link-1")).toThrow();
    expect(() => engine.listLinks()).toThrow();
    expect(() => engine.search()).toThrow();
    expect(() => engine.searchByStrategy({
      type: "direct",
      filters: { sourceId: "entity-a" },
    })).toThrow();
    expect(() => engine.removeLink("link-1")).toThrow();
    expect(() => engine.clear()).toThrow();
  });

  it("kthen rezultate të ngrira", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLink(createLink("link-1"));

    const result = engine.listLinks();

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.links)).toBe(true);
  });
});
