import { describe, it, expect } from "vitest";

import {
  createKnowledgeLinkEngine,
  KNOWLEDGE_LINK_ENGINE_VERSION,
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

describe("KnowledgeLink Engine — Lifecycle Integrity", () => {
  it("nis me gjendje të pastër dhe versionin e pritshëm", () => {
    const engine = createKnowledgeLinkEngine();
    const status = engine.getStatus();

    expect(status.version).toBe(KNOWLEDGE_LINK_ENGINE_VERSION);
    expect(status.version).toBe("1.1.0");
    expect(status.closed).toBe(false);
    expect(status.size).toBe(0);
  });

  it("menaxhon ciklin shtim, lexim, fshirje dhe shtim të ri", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLink(createLink("lifecycle-a"));

    expect(engine.getStatus().size).toBe(1);
    expect(engine.getLinkById("lifecycle-a").id).toBe(
      "lifecycle-a",
    );

    const removed = engine.removeLink("lifecycle-a");

    expect(removed).toBe(true);
    expect(engine.getLinkById("lifecycle-a")).toBeNull();
    expect(engine.getStatus().size).toBe(0);

    engine.addLink(createLink("lifecycle-b"));

    expect(engine.getLinkById("lifecycle-b").id).toBe(
      "lifecycle-b",
    );
    expect(engine.getStatus().size).toBe(1);
  });

  it("lejon pastrime të përsëritura pa dëmtuar gjendjen", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLinks([
      createLink("clear-a"),
      createLink("clear-b"),
    ]);

    const firstClear = engine.clear();
    const secondClear = engine.clear();

    expect(firstClear.removedCount).toBe(2);
    expect(secondClear.removedCount).toBe(0);
    expect(engine.getStatus().size).toBe(0);
    expect(engine.getStatus().closed).toBe(false);
  });

  it("lejon vazhdimin e punës pas pastrimit", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLink(createLink("before-clear"));

    engine.clear();

    expect(engine.getStatus().closed).toBe(false);

    engine.addLink(createLink("after-clear"));

    expect(engine.getLinkById("after-clear")).not.toBeNull();
    expect(engine.getLinkById("before-clear")).toBeNull();
    expect(engine.getStatus().size).toBe(1);
  });

  it("mbyll engine-in dhe pastron të gjitha lidhjet", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLinks([
      createLink("close-a"),
      createLink("close-b"),
    ]);

    const result = engine.close();

    expect(result.success).toBe(true);
    expect(result.closed).toBe(true);
    expect(result.alreadyClosed).toBe(false);

    const status = engine.getStatus();

    expect(status.closed).toBe(true);
    expect(status.size).toBe(0);
  });

  it("e trajton mbylljen e përsëritur në mënyrë idempotente", () => {
    const engine = createKnowledgeLinkEngine();

    const first = engine.close();
    const second = engine.close();
    const third = engine.close();

    expect(first.alreadyClosed).toBe(false);
    expect(second.closed).toBe(true);
    expect(second.alreadyClosed).toBe(true);
    expect(third.closed).toBe(true);
    expect(third.alreadyClosed).toBe(true);
  });

  it("refuzon operacionet që ndryshojnë gjendjen pas mbylljes", () => {
    const engine = createKnowledgeLinkEngine();

    engine.close();

    expect(() => {
      engine.addLink(createLink("rejected-link"));
    }).toThrow();

    expect(() => {
      engine.addLinks([
        createLink("rejected-a"),
        createLink("rejected-b"),
      ]);
    }).toThrow();

    expect(() => {
      engine.removeLink("rejected-link");
    }).toThrow();

    expect(engine.getStatus().size).toBe(0);
    expect(engine.getStatus().closed).toBe(true);
  });

  it("refuzon kërkimet pas mbylljes pa ndryshuar statusin", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLink(createLink("search-before-close"));
    engine.close();

    expect(() => engine.listLinks()).toThrow();
    expect(() => engine.search()).toThrow();

    expect(engine.getStatus()).toMatchObject({
      closed: true,
      size: 0,
      version: "1.1.0",
    });
  });
});
