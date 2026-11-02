import { describe, it, expect } from "vitest";

import {
  verifyKnowledgeLinkIndexes,
  rebuildKnowledgeLinkIndexes,
  recoverKnowledgeLinkIndexes,
} from "../../../engines/knowledge-link.index-integrity.js";

function createLink(id, sourceId, targetId, relationType = "supports") {
  return Object.freeze({
    id,
    sourceId,
    targetId,
    relationType,
    confidence: 0.9,
    timestamp: "2026-01-01T00:00:00.000Z",
    metadata: Object.freeze({}),
  });
}

function createIndexes(links) {
  const sourceIdIndex = new Map();
  const targetIdIndex = new Map();
  const relationTypeIndex = new Map();

  for (const link of links.values()) {
    addToIndex(sourceIdIndex, link.sourceId, link.id);
    addToIndex(targetIdIndex, link.targetId, link.id);
    addToIndex(relationTypeIndex, link.relationType, link.id);
  }

  return {
    sourceIdIndex,
    targetIdIndex,
    relationTypeIndex,
  };
}

function addToIndex(index, key, id) {
  if (!index.has(key)) {
    index.set(key, new Set());
  }

  index.get(key).add(id);
}

function snapshotIndexes(indexes) {
  return Object.fromEntries(
    Object.entries(indexes).map(([name, index]) => [
      name,
      [...index.entries()].map(([key, ids]) => [
        key,
        [...ids].sort(),
      ]),
    ]),
  );
}

describe("XSUS Hyper Core — Knowledge Link Index Concurrency Integrity", () => {
  it("ruan integritetin pas disa verifikimeve paralele", async () => {
    const links = new Map([
      ["link-1", createLink("link-1", "node-a", "node-b")],
      ["link-2", createLink("link-2", "node-a", "node-c")],
      ["link-3", createLink("link-3", "node-d", "node-b")],
    ]);

    const indexes = createIndexes(links);

    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        Promise.resolve(
          verifyKnowledgeLinkIndexes({ links, indexes }),
        ),
      ),
    );

    expect(results).toHaveLength(20);

    for (const result of results) {
      expect(result.valid).toBe(true);
      expect(result.checkedLinks).toBe(3);
    }
  });

  it("ruan konsistencën pas rindërtimeve të njëpasnjëshme", async () => {
    const links = new Map([
      ["link-1", createLink("link-1", "node-a", "node-b")],
      ["link-2", createLink("link-2", "node-c", "node-d")],
    ]);

    const indexes = createIndexes(links);

    const first = await Promise.resolve(
      rebuildKnowledgeLinkIndexes({ links, indexes }),
    );

    const second = await Promise.resolve(
      rebuildKnowledgeLinkIndexes({ links, indexes }),
    );

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);

    expect(
      verifyKnowledgeLinkIndexes({ links, indexes }).valid,
    ).toBe(true);
  });

  it("ruan identitetin e Map-eve aktive gjatë rindërtimit", () => {
    const links = new Map([
      ["link-1", createLink("link-1", "node-a", "node-b")],
    ]);

    const indexes = createIndexes(links);

    const originalSourceIndex = indexes.sourceIdIndex;
    const originalTargetIndex = indexes.targetIdIndex;
    const originalRelationIndex = indexes.relationTypeIndex;

    indexes.sourceIdIndex.clear();

    const result = rebuildKnowledgeLinkIndexes({
      links,
      indexes,
    });

    expect(result.success).toBe(true);
    expect(indexes.sourceIdIndex).toBe(originalSourceIndex);
    expect(indexes.targetIdIndex).toBe(originalTargetIndex);
    expect(indexes.relationTypeIndex).toBe(originalRelationIndex);
  });

  it("ruan koleksionin kryesor gjatë rikuperimeve të përsëritura", () => {
    const links = new Map([
      ["link-1", createLink("link-1", "node-a", "node-b")],
      ["link-2", createLink("link-2", "node-c", "node-d")],
    ]);

    const originalLinks = [...links.entries()];
    const indexes = createIndexes(links);

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

    expect([...links.entries()]).toEqual(originalLinks);
  });

  it("përfundon me indekse të vlefshme pas rikuperimit të ndërthurur", async () => {
    const links = new Map([
      ["link-1", createLink("link-1", "node-a", "node-b")],
      ["link-2", createLink("link-2", "node-c", "node-d")],
      ["link-3", createLink("link-3", "node-e", "node-f")],
    ]);

    const indexes = createIndexes(links);

    indexes.targetIdIndex.clear();

    const operations = await Promise.all([
      Promise.resolve().then(() =>
        verifyKnowledgeLinkIndexes({ links, indexes }),
      ),
      Promise.resolve().then(() =>
        rebuildKnowledgeLinkIndexes({ links, indexes }),
      ),
      Promise.resolve().then(() =>
        recoverKnowledgeLinkIndexes({ links, indexes }),
      ),
    ]);

    expect(operations[0].valid).toBe(false);
    expect(operations[1].success).toBe(true);
    expect(operations[2].success).toBe(true);

    expect(
      verifyKnowledgeLinkIndexes({ links, indexes }).valid,
    ).toBe(true);
  });

  it("ruan të njëjtën gjendje të indekseve në verifikime të përsëritura", () => {
    const links = new Map([
      ["link-1", createLink("link-1", "node-a", "node-b")],
      ["link-2", createLink("link-2", "node-a", "node-c")],
    ]);

    const indexes = createIndexes(links);

    const before = snapshotIndexes(indexes);

    verifyKnowledgeLinkIndexes({ links, indexes });
    verifyKnowledgeLinkIndexes({ links, indexes });

    const after = snapshotIndexes(indexes);

    expect(after).toEqual(before);
  });
});
