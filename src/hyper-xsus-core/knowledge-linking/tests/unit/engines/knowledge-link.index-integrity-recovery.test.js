import {
  describe,
  it,
  expect,
} from "vitest";

import {
  verifyKnowledgeLinkIndexes,
  rebuildKnowledgeLinkIndexes,
  recoverKnowledgeLinkIndexes,
} from "../../../engines/knowledge-link.index-integrity.js";

function createLink(id, overrides = {}) {
  return Object.freeze({
    id,
    sourceId: "source-a",
    targetId: "target-a",
    relationType: "supports",
    confidence: 0.9,
    timestamp: "2026-01-01T00:00:00.000Z",
    metadata: Object.freeze({}),
    ...overrides,
  });
}

function createLinks() {
  return new Map([
    ["link-1", createLink("link-1")],
    [
      "link-2",
      createLink("link-2", {
        sourceId: "source-b",
        targetId: "target-b",
        relationType: "depends_on",
      }),
    ],
    [
      "link-3",
      createLink("link-3", {
        sourceId: "source-a",
        targetId: "target-c",
        relationType: "contains",
      }),
    ],
  ]);
}

function createIndexes() {
  return {
    sourceIdIndex: new Map(),
    targetIdIndex: new Map(),
    relationTypeIndex: new Map(),
  };
}

function createValidIndexes(links) {
  const indexes = createIndexes();

  rebuildKnowledgeLinkIndexes({
    links,
    indexes,
  });

  return indexes;
}

describe(
  "XSUS Hyper Core — KnowledgeLink Index Integrity Recovery",
  () => {
    it("zbulon hyrjet që mungojnë në indekse", () => {
      const links = createLinks();
      const indexes = createValidIndexes(links);

      indexes.sourceIdIndex.get("source-a").delete("link-1");

      const report = verifyKnowledgeLinkIndexes({
        links,
        indexes,
      });

      expect(report.valid).toBe(false);

      expect(report.missingEntries).toContainEqual({
        index: "sourceId",
        value: "source-a",
        id: "link-1",
      });
    });

    it("zbulon referencat e tepërta në indekse", () => {
      const links = createLinks();
      const indexes = createValidIndexes(links);

      indexes.sourceIdIndex.set(
        "unknown-source",
        new Set(["missing-link"]),
      );

      const report = verifyKnowledgeLinkIndexes({
        links,
        indexes,
      });

      expect(report.valid).toBe(false);

      expect(report.staleEntries).toContainEqual({
        index: "sourceId",
        value: "unknown-source",
        id: "missing-link",
        reason: "LINK_NOT_FOUND",
      });
    });

    it("zbulon vlera të pavlefshme në indekse", () => {
      const links = createLinks();
      const indexes = createValidIndexes(links);

      indexes.targetIdIndex.set(
        "invalid-target",
        ["link-1"],
      );

      const report = verifyKnowledgeLinkIndexes({
        links,
        indexes,
      });

      expect(report.valid).toBe(false);

      expect(report.invalidEntries).toContainEqual({
        index: "targetId",
        value: "invalid-target",
        reason: "INDEX_VALUE_MUST_BE_SET",
      });
    });

    it("zbulon Set bosh në indeks", () => {
      const links = createLinks();
      const indexes = createValidIndexes(links);

      indexes.relationTypeIndex.set(
        "empty-relation",
        new Set(),
      );

      const report = verifyKnowledgeLinkIndexes({
        links,
        indexes,
      });

      expect(report.valid).toBe(false);

      expect(report.invalidEntries).toContainEqual({
        index: "relationType",
        value: "empty-relation",
        reason: "EMPTY_INDEX_SET",
      });
    });

    it("rindërton indekset e dëmtuara", () => {
      const links = createLinks();
      const indexes = createValidIndexes(links);

      indexes.sourceIdIndex.clear();

      indexes.targetIdIndex.set(
        "stale-target",
        new Set(["missing-link"]),
      );

      const result = rebuildKnowledgeLinkIndexes({
        links,
        indexes,
      });

      expect(result.success).toBe(true);
      expect(result.verification.valid).toBe(true);

      expect(
        verifyKnowledgeLinkIndexes({
          links,
          indexes,
        }).valid,
      ).toBe(true);
    });

    it("rikuperon automatikisht hyrjet që mungojnë", () => {
      const links = createLinks();
      const indexes = createValidIndexes(links);

      indexes.sourceIdIndex.get("source-a").delete("link-1");

      const result = recoverKnowledgeLinkIndexes({
        links,
        indexes,
      });

      expect(result.success).toBe(true);
      expect(result.recovered).toBe(true);
      expect(result.before.valid).toBe(false);
      expect(result.after.valid).toBe(true);
    });

    it("rikuperon automatikisht hyrjet e tepërta", () => {
      const links = createLinks();
      const indexes = createValidIndexes(links);

      indexes.targetIdIndex.set(
        "stale-target",
        new Set(["unknown-link"]),
      );

      const result = recoverKnowledgeLinkIndexes({
        links,
        indexes,
      });

      expect(result.success).toBe(true);
      expect(result.recovered).toBe(true);
      expect(result.after.valid).toBe(true);

      expect(
        indexes.targetIdIndex.has("stale-target"),
      ).toBe(false);
    });

    it("ruan identitetin e Map-eve aktive gjatë rindërtimit", () => {
      const links = createLinks();
      const indexes = createIndexes();

      const sourceIndex = indexes.sourceIdIndex;
      const targetIndex = indexes.targetIdIndex;
      const relationIndex = indexes.relationTypeIndex;

      rebuildKnowledgeLinkIndexes({
        links,
        indexes,
      });

      expect(indexes.sourceIdIndex).toBe(sourceIndex);
      expect(indexes.targetIdIndex).toBe(targetIndex);
      expect(indexes.relationTypeIndex).toBe(relationIndex);
    });

    it("nuk ndryshon koleksionin kryesor gjatë rikuperimit", () => {
      const links = createLinks();
      const indexes = createValidIndexes(links);

      const originalEntries = [...links.entries()];

      indexes.sourceIdIndex.clear();

      const result = recoverKnowledgeLinkIndexes({
        links,
        indexes,
      });

      expect(result.success).toBe(true);
      expect([...links.entries()]).toEqual(originalEntries);
    });

    it("ruan rendin e lidhjeve gjatë rikuperimit", () => {
      const links = createLinks();
      const indexes = createValidIndexes(links);

      const originalOrder = [...links.keys()];

      indexes.targetIdIndex.clear();

      recoverKnowledgeLinkIndexes({
        links,
        indexes,
      });

      expect([...links.keys()]).toEqual(originalOrder);
    });

    it("nuk rindërton indekset kur janë tashmë të sakta", () => {
      const links = createLinks();
      const indexes = createValidIndexes(links);

      const result = recoverKnowledgeLinkIndexes({
        links,
        indexes,
      });

      expect(result.success).toBe(true);
      expect(result.recovered).toBe(false);
      expect(result.before.valid).toBe(true);
      expect(result.after).toBe(result.before);
      expect(result.rebuild).toBeNull();
    });

    it("lejon rikuperim të përsëritur pa ndryshime të panevojshme", () => {
      const links = createLinks();
      const indexes = createValidIndexes(links);

      indexes.sourceIdIndex.clear();

      const first = recoverKnowledgeLinkIndexes({
        links,
        indexes,
      });

      const second = recoverKnowledgeLinkIndexes({
        links,
        indexes,
      });

      expect(first.success).toBe(true);
      expect(first.recovered).toBe(true);

      expect(second.success).toBe(true);
      expect(second.recovered).toBe(false);
      expect(second.after.valid).toBe(true);
    });

    it("refuzon koleksionin kryesor të pavlefshëm", () => {
      const links = new Map([
        ["link-1", {
          id: "different-id",
          sourceId: "source-a",
          targetId: "target-a",
          relationType: "supports",
        }],
      ]);

      const indexes = createIndexes();

      expect(() =>
        recoverKnowledgeLinkIndexes({
          links,
          indexes,
        }),
      ).toThrow(
        "KnowledgeLink ID mismatch: link-1.",
      );
    });

    it("kthen raport të pandryshueshëm", () => {
      const links = createLinks();
      const indexes = createValidIndexes(links);

      const result = recoverKnowledgeLinkIndexes({
        links,
        indexes,
      });

      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.before)).toBe(true);
      expect(Object.isFrozen(result.after)).toBe(true);
      expect(
        Object.isFrozen(result.after.missingEntries),
      ).toBe(true);
    });
  },
);
