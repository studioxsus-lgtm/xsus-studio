import { describe, it, expect } from "vitest";

import {
  KNOWLEDGE_LINK_INDEX_INTEGRITY_VERSION,
  verifyKnowledgeLinkIndexes,
  rebuildKnowledgeLinkIndexes,
  recoverKnowledgeLinkIndexes,
} from "../../../engines/knowledge-link.index-integrity.js";

function createLink(
  id,
  sourceId = "node-a",
  targetId = "node-b",
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

function createIndexes(links) {
  const indexes = {
    sourceIdIndex: new Map(),
    targetIdIndex: new Map(),
    relationTypeIndex: new Map(),
  };

  for (const link of links.values()) {
    addToIndex(indexes.sourceIdIndex, link.sourceId, link.id);
    addToIndex(indexes.targetIdIndex, link.targetId, link.id);
    addToIndex(
      indexes.relationTypeIndex,
      link.relationType,
      link.id,
    );
  }

  return indexes;
}

function createHealthyState() {
  const links = new Map([
    ["link-1", createLink("link-1", "node-a", "node-b")],
    [
      "link-2",
      createLink("link-2", "node-c", "node-d", "depends_on"),
    ],
  ]);

  return {
    links,
    indexes: createIndexes(links),
  };
}

function snapshotIndexes(indexes) {
  return Object.fromEntries(
    Object.entries(indexes).map(([name, index]) => [
      name,
      [...index.entries()]
        .map(([key, ids]) => [key, [...ids].sort()])
        .sort(([a], [b]) =>
          String(a).localeCompare(String(b)),
        ),
    ]),
  );
}

describe("XSUS Hyper Core — Index Integrity Contract", () => {
  it("publikon versionin e kontratës së integritetit", () => {
    expect(KNOWLEDGE_LINK_INDEX_INTEGRITY_VERSION).toBe("1.0.0");
  });

  it("kthen raport verifikimi me strukturë të qëndrueshme", () => {
    const { links, indexes } = createHealthyState();

    const result = verifyKnowledgeLinkIndexes({
      links,
      indexes,
    });

    expect(result).toMatchObject({
      valid: true,
      checkedLinks: 2,
      checkedIndexes: 3,
      missingEntries: [],
      staleEntries: [],
      invalidEntries: [],
    });

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.missingEntries)).toBe(true);
    expect(Object.isFrozen(result.staleEntries)).toBe(true);
    expect(Object.isFrozen(result.invalidEntries)).toBe(true);
  });

  it("raporton hyrjet që mungojnë pa ndryshuar indekset", () => {
    const { links, indexes } = createHealthyState();

    indexes.sourceIdIndex.get("node-a").delete("link-1");

    const before = snapshotIndexes(indexes);

    const result = verifyKnowledgeLinkIndexes({
      links,
      indexes,
    });

    expect(result.valid).toBe(false);
    expect(result.missingEntries.length).toBeGreaterThan(0);
    expect(snapshotIndexes(indexes)).toEqual(before);
  });

  it("kthen sukses pas rindërtimit të indekseve të dëmtuara", () => {
    const { links, indexes } = createHealthyState();

    indexes.targetIdIndex.clear();

    const result = rebuildKnowledgeLinkIndexes({
      links,
      indexes,
    });

    expect(result.success).toBe(true);
    expect(result.version).toBe(
      KNOWLEDGE_LINK_INDEX_INTEGRITY_VERSION,
    );
    expect(result.rebuiltLinks).toBe(2);

    expect(result.rebuiltIndexes).toEqual({
      sourceId: 2,
      targetId: 2,
      relationType: 2,
    });

    expect(result.verification.valid).toBe(true);

    expect(
      verifyKnowledgeLinkIndexes({ links, indexes }).valid,
    ).toBe(true);
  });

  it("shënon rikuperimin e parë si të realizuar", () => {
    const { links, indexes } = createHealthyState();

    indexes.sourceIdIndex.clear();

    const result = recoverKnowledgeLinkIndexes({
      links,
      indexes,
    });

    expect(result.success).toBe(true);
    expect(result.recovered).toBe(true);
    expect(result.before.valid).toBe(false);
    expect(result.after.valid).toBe(true);
    expect(result.rebuild.success).toBe(true);
  });

  it("nuk rindërton indekset kur ato janë tashmë të vlefshme", () => {
    const { links, indexes } = createHealthyState();

    const before = snapshotIndexes(indexes);

    const result = recoverKnowledgeLinkIndexes({
      links,
      indexes,
    });

    expect(result.success).toBe(true);
    expect(result.recovered).toBe(false);
    expect(result.before.valid).toBe(true);
    expect(result.after).toBe(result.before);
    expect(result.rebuild).toBeNull();
    expect(snapshotIndexes(indexes)).toEqual(before);
  });

  it("refuzon koleksionin kryesor kur ID-ja nuk përputhet me çelësin", () => {
    const links = new Map([
      ["wrong-key", createLink("link-1")],
    ]);

    const indexes = createIndexes(
      new Map([["link-1", createLink("link-1")]]),
    );

    expect(() =>
      verifyKnowledgeLinkIndexes({ links, indexes }),
    ).toThrow();

    expect(() =>
      rebuildKnowledgeLinkIndexes({ links, indexes }),
    ).toThrow();

    expect(() =>
      recoverKnowledgeLinkIndexes({ links, indexes }),
    ).toThrow();
  });

  it("refuzon strukturën e pavlefshme të indekseve", () => {
    const { links } = createHealthyState();

    expect(() =>
      verifyKnowledgeLinkIndexes({
        links,
        indexes: null,
      }),
    ).toThrow();

    expect(() =>
      rebuildKnowledgeLinkIndexes({
        links,
        indexes: null,
      }),
    ).toThrow();

    expect(() =>
      recoverKnowledgeLinkIndexes({
        links,
        indexes: null,
      }),
    ).toThrow();
  });

  it("ruan koleksionin kryesor pas një rikuperimi të suksesshëm", () => {
    const { links, indexes } = createHealthyState();

    const originalLinks = [...links.entries()];

    indexes.relationTypeIndex.clear();

    const result = recoverKnowledgeLinkIndexes({
      links,
      indexes,
    });

    expect(result.success).toBe(true);
    expect([...links.entries()]).toEqual(originalLinks);
  });
});
