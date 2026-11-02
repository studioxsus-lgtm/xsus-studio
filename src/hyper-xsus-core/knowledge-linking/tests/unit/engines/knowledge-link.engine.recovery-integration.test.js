import {
  describe,
  it,
  expect,
} from "vitest";

import {
  createKnowledgeLinkEngine,
  KNOWLEDGE_LINK_ENGINE_VERSION,
} from "../../../engines/knowledge-link.engine.js";

function createLink(id, overrides = {}) {
  return {
    id,
    sourceId: "source-a",
    targetId: "target-a",
    relationType: "supports",
    confidence: 0.9,
    timestamp: "2026-01-01T00:00:00.000Z",
    metadata: {},
    ...overrides,
  };
}

function createEngine() {
  return createKnowledgeLinkEngine();
}

describe(
  "XSUS Hyper Core — KnowledgeLink Engine Recovery Integration",
  () => {
    it("ruan versionin dhe API-në publike të Engine", () => {
      const engine = createEngine();

      expect(KNOWLEDGE_LINK_ENGINE_VERSION).toBe("1.1.0");

      expect(typeof engine.addLink).toBe("function");
      expect(typeof engine.addLinks).toBe("function");
      expect(typeof engine.search).toBe("function");
      expect(typeof engine.verifyIndexIntegrity).toBe("function");
      expect(typeof engine.rebuildIndexes).toBe("function");
      expect(typeof engine.recoverIndexIntegrity).toBe("function");
    });

    it("rikthen integritetin përmes API-së publike", () => {
      const engine = createEngine();

      engine.addLinks([
        createLink("link-1"),
        createLink("link-2", {
          sourceId: "source-b",
          relationType: "depends_on",
        }),
      ]);

      const recovery = engine.recoverIndexIntegrity();

      expect(recovery.success).toBe(true);
      expect(recovery.after.valid).toBe(true);
      expect(engine.verifyIndexIntegrity().valid).toBe(true);
    });

    it("ruan të gjitha lidhjet pas rikuperimit", () => {
      const engine = createEngine();

      engine.addLinks([
        createLink("link-1"),
        createLink("link-2"),
        createLink("link-3"),
      ]);

      const before = engine.listLinks();
      const recovery = engine.recoverIndexIntegrity();
      const after = engine.listLinks();

      expect(recovery.success).toBe(true);
      expect(after).toEqual(before);
      expect(after.count).toBe(3);
      expect(after.links).toHaveLength(3);
    });

    it("ruan rendin e futjes pas rikuperimit", () => {
      const engine = createEngine();

      engine.addLinks([
        createLink("link-3"),
        createLink("link-1"),
        createLink("link-2"),
      ]);

      const before = engine.listLinks().links;

      const recovery = engine.recoverIndexIntegrity();

      const after = engine.listLinks().links;

      expect(recovery.success).toBe(true);

      expect(
        after.map((link) => link.id),
      ).toEqual(
        before.map((link) => link.id),
      );
    });

    it("ruan saktësinë e kërkimit pas rikuperimit", () => {
      const engine = createEngine();

      engine.addLinks([
        createLink("link-1", {
          sourceId: "source-a",
        }),
        createLink("link-2", {
          sourceId: "source-b",
        }),
        createLink("link-3", {
          sourceId: "source-a",
        }),
      ]);

      const recovery = engine.recoverIndexIntegrity();

      const result = engine.search({
        sourceId: "source-a",
      });

      expect(recovery.success).toBe(true);
      expect(result.count).toBe(2);

      expect(
        result.links.map((link) => link.id),
      ).toEqual(["link-1", "link-3"]);
    });

    it("mbetet konsistent pas shtimit të lidhjeve", () => {
      const engine = createEngine();

      engine.addLink(createLink("link-1"));

      engine.recoverIndexIntegrity();

      engine.addLink(
        createLink("link-2", {
          sourceId: "source-b",
        }),
      );

      expect(engine.verifyIndexIntegrity().valid).toBe(true);

      expect(
        engine.search({
          sourceId: "source-b",
        }).count,
      ).toBe(1);
    });

    it("mbetet konsistent pas heqjes së lidhjeve", () => {
      const engine = createEngine();

      engine.addLinks([
        createLink("link-1"),
        createLink("link-2"),
      ]);

      engine.recoverIndexIntegrity();

      engine.removeLink("link-1");

      expect(engine.verifyIndexIntegrity().valid).toBe(true);
      expect(engine.getLinkById("link-1")).toBeNull();
      expect(engine.getLinkById("link-2")).not.toBeNull();
    });

    it("mbetet konsistent pas clear", () => {
      const engine = createEngine();

      engine.addLinks([
        createLink("link-1"),
        createLink("link-2"),
      ]);

      engine.recoverIndexIntegrity();

      engine.clear();

      const verification = engine.verifyIndexIntegrity();
      const result = engine.listLinks();

      expect(verification.valid).toBe(true);
      expect(verification.checkedLinks).toBe(0);

      expect(result.count).toBe(0);
      expect(result.links).toHaveLength(0);
    });

    it("lejon rikuperime të përsëritura", () => {
      const engine = createEngine();

      engine.addLink(createLink("link-1"));

      const first = engine.recoverIndexIntegrity();
      const second = engine.recoverIndexIntegrity();

      expect(first.success).toBe(true);
      expect(second.success).toBe(true);

      expect(first.after.valid).toBe(true);
      expect(second.after.valid).toBe(true);
    });

    it("refuzon rikuperimin pas mbylljes së Engine", () => {
      const engine = createEngine();

      engine.close();

      expect(() => {
        engine.recoverIndexIntegrity();
      }).toThrow();
    });

    it("ruan statusin e mbylljes pas rikuperimit të refuzuar", () => {
      const engine = createEngine();

      engine.addLink(createLink("link-1"));
      engine.close();

      expect(() => {
        engine.recoverIndexIntegrity();
      }).toThrow();

      expect(engine.getStatus().closed).toBe(true);
    });
  },
);
