import { describe, it, expect } from "vitest";

import {
  verifyKnowledgeLinkIndexes,
  rebuildKnowledgeLinkIndexes,
  recoverKnowledgeLinkIndexes,
} from "../../../engines/knowledge-link.index-integrity.js";

function createLink(
  id,
  sourceId,
  targetId,
  relationType = "supports",
) {
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

function addToIndex(index, key, id) {
  if (!index.has(key)) {
    index.set(key, new Set());
  }

  index.get(key).add(id);
}

function createState() {
  const links = new Map([
    ["link-1", createLink("link-1", "node-a", "node-b")],
    ["link-2", createLink("link-2", "node-c", "node-d", "depends_on")],
  ]);

  const indexes = {
    sourceIdIndex: new Map(),
    targetIdIndex: new Map(),
    relationTypeIndex: new Map(),
  };

  for (const link of links.values()) {
    addToIndex(indexes.sourceIdIndex, link.sourceId, link.id);
    addToIndex(indexes.targetIdIndex, link.targetId, link.id);
    addToIndex(indexes.relationTypeIndex, link.relationType, link.id);
  }

  return { links, indexes };
}

describe("XSUS Hyper Core — Index Integrity Audit", () => {
  it("verifikimi nuk ndryshon koleksionin kryesor", () => {
    const { links, indexes } = createState();
    const before = [...links.entries()];

    const report = verifyKnowledgeLinkIndexes({
      links,
      indexes,
    });

    expect(report.valid).toBe(true);
    expect([...links.entries()]).toEqual(before);
  });

  it("verifikimi nuk ndryshon indekset", () => {
    const { links, indexes } = createState();

    const before = {
      source: [...indexes.sourceIdIndex.entries()].map(
        ([key, ids]) => [key, [...ids]],
      ),
      target: [...indexes.targetIdIndex.entries()].map(
        ([key, ids]) => [key, [...ids]],
      ),
      relation: [...indexes.relationTypeIndex.entries()].map(
        ([key, ids]) => [key, [...ids]],
      ),
    };

    verifyKnowledgeLinkIndexes({ links, indexes });

    const after = {
      source: [...indexes.sourceIdIndex.entries()].map(
        ([key, ids]) => [key, [...ids]],
      ),
      target: [...indexes.targetIdIndex.entries()].map(
        ([key, ids]) => [key, [...ids]],
      ),
      relation: [...indexes.relationTypeIndex.entries()].map(
        ([key, ids]) => [key, [...ids]],
      ),
    };

    expect(after).toEqual(before);
  });

  it("rindërtimi ruan koleksionin kryesor për auditim", () => {
    const { links, indexes } = createState();
    const before = [...links.entries()];

    indexes.sourceIdIndex.clear();

    const result = rebuildKnowledgeLinkIndexes({
      links,
      indexes,
    });

    expect(result.success).toBe(true);
    expect([...links.entries()]).toEqual(before);
    expect(result.verification.valid).toBe(true);
  });

  it("rikuperimi ruan provat e gjendjes para operacionit", () => {
    const { links, indexes } = createState();

    indexes.targetIdIndex.clear();

    const before = verifyKnowledgeLinkIndexes({
      links,
      indexes,
    });

    const result = recoverKnowledgeLinkIndexes({
      links,
      indexes,
    });

    expect(result.success).toBe(true);
    expect(result.before).toEqual(before);
    expect(result.before.valid).toBe(false);
    expect(result.after.valid).toBe(true);
  });

  it("rikuperimi i përsëritur nuk krijon ndryshime të panevojshme", () => {
    const { links, indexes } = createState();

    indexes.sourceIdIndex.clear();

    const first = recoverKnowledgeLinkIndexes({
      links,
      indexes,
    });

    const snapshot = {
      source: [...indexes.sourceIdIndex.entries()].map(
        ([key, ids]) => [key, [...ids]],
      ),
      target: [...indexes.targetIdIndex.entries()].map(
        ([key, ids]) => [key, [...ids]],
      ),
      relation: [...indexes.relationTypeIndex.entries()].map(
        ([key, ids]) => [key, [...ids]],
      ),
    };

    const second = recoverKnowledgeLinkIndexes({
      links,
      indexes,
    });

    expect(first.recovered).toBe(true);
    expect(second.recovered).toBe(false);

    expect({
      source: [...indexes.sourceIdIndex.entries()].map(
        ([key, ids]) => [key, [...ids]],
      ),
      target: [...indexes.targetIdIndex.entries()].map(
        ([key, ids]) => [key, [...ids]],
      ),
      relation: [...indexes.relationTypeIndex.entries()].map(
        ([key, ids]) => [key, [...ids]],
      ),
    }).toEqual(snapshot);
  });

  it("nuk pretendon se ekziston audit trail kur implementimi nuk e ofron", () => {
    const { links, indexes } = createState();

    const result = recoverKnowledgeLinkIndexes({
      links,
      indexes,
    });

    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("recovered");
    expect(result).toHaveProperty("before");
    expect(result).toHaveProperty("after");
    expect(result).toHaveProperty("rebuild");

    // Historiku i përhershëm i auditimit nuk është
    // pjesë e kontratës aktuale të Index Integrity.
    expect(result).not.toHaveProperty("auditTrail");
  });
});
