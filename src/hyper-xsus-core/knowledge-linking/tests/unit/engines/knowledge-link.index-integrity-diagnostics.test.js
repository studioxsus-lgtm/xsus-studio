import { describe, it, expect } from "vitest";

import {
  KNOWLEDGE_LINK_INDEX_INTEGRITY_VERSION,
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

function createIndexes(links) {
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

  return indexes;
}

function createState() {
  const links = new Map([
    ["link-1", createLink("link-1", "node-a", "node-b")],
    ["link-2", createLink("link-2", "node-c", "node-d", "depends_on")],
  ]);

  return {
    links,
    indexes: createIndexes(links),
  };
}

describe("XSUS Hyper Core — Index Integrity Diagnostics", () => {
  it("ekspozon versionin e diagnostikimit", () => {
    expect(KNOWLEDGE_LINK_INDEX_INTEGRITY_VERSION).toBe("1.0.0");
  });

  it("identifikon gjendjen e shëndetshme të indekseve", () => {
    const { links, indexes } = createState();

    const report = verifyKnowledgeLinkIndexes({
      links,
      indexes,
    });

    expect(report.valid).toBe(true);
    expect(report.checkedLinks).toBe(2);
    expect(report.checkedIndexes).toBe(3);
    expect(report.missingEntries).toEqual([]);
    expect(report.staleEntries).toEqual([]);
    expect(report.invalidEntries).toEqual([]);
  });

  it("identifikon indeksin ku mungon një hyrje", () => {
    const { links, indexes } = createState();

    indexes.sourceIdIndex.get("node-a").delete("link-1");

    const report = verifyKnowledgeLinkIndexes({
      links,
      indexes,
    });

    expect(report.valid).toBe(false);
    expect(report.missingEntries.length).toBeGreaterThan(0);

    expect(
      report.missingEntries.some(
        (entry) => entry.index === "sourceId",
      ),
    ).toBe(true);
  });

  it("identifikon hyrjet e vjetruara në indekse", () => {
    const { links, indexes } = createState();

    addToIndex(
      indexes.sourceIdIndex,
      "node-obsolete",
      "missing-link",
    );

    const report = verifyKnowledgeLinkIndexes({
      links,
      indexes,
    });

    expect(report.valid).toBe(false);
    expect(report.staleEntries.length).toBeGreaterThan(0);

    expect(
      report.staleEntries.some(
        (entry) => entry.index === "sourceId",
      ),
    ).toBe(true);
  });

  it("identifikon strukturat e pavlefshme të hyrjeve të indekseve", () => {
    const { links, indexes } = createState();

    indexes.targetIdIndex.set("node-b", null);

    const report = verifyKnowledgeLinkIndexes({
      links,
      indexes,
    });

    expect(report.valid).toBe(false);
    expect(report.invalidEntries.length).toBeGreaterThan(0);
  });

  it("raporton rindërtimin e suksesshëm me detaje", () => {
    const { links, indexes } = createState();

    indexes.relationTypeIndex.clear();

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
  });

  it("dallon rikuperimin e kryer nga mungesa e nevojës për rikuperim", () => {
    const { links, indexes } = createState();

    const healthyResult = recoverKnowledgeLinkIndexes({
      links,
      indexes,
    });

    expect(healthyResult.success).toBe(true);
    expect(healthyResult.recovered).toBe(false);
    expect(healthyResult.rebuild).toBeNull();

    indexes.sourceIdIndex.clear();

    const recoveryResult = recoverKnowledgeLinkIndexes({
      links,
      indexes,
    });

    expect(recoveryResult.success).toBe(true);
    expect(recoveryResult.recovered).toBe(true);
    expect(recoveryResult.before.valid).toBe(false);
    expect(recoveryResult.after.valid).toBe(true);
  });

  it("ruan raportin e gjendjes fillestare pas rikuperimit", () => {
    const { links, indexes } = createState();

    indexes.targetIdIndex.clear();

    const result = recoverKnowledgeLinkIndexes({
      links,
      indexes,
    });

    expect(result.before.valid).toBe(false);
    expect(result.after.valid).toBe(true);
    expect(result.before).not.toBe(result.after);
  });

  it("nuk ndryshon koleksionin kryesor gjatë diagnostikimit", () => {
    const { links, indexes } = createState();

    const originalLinks = [...links.entries()];

    verifyKnowledgeLinkIndexes({ links, indexes });

    expect([...links.entries()]).toEqual(originalLinks);
  });

  it("ruan raportet diagnostikuese si struktura të pandryshueshme", () => {
    const { links, indexes } = createState();

    const report = verifyKnowledgeLinkIndexes({
      links,
      indexes,
    });

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.missingEntries)).toBe(true);
    expect(Object.isFrozen(report.staleEntries)).toBe(true);
    expect(Object.isFrozen(report.invalidEntries)).toBe(true);
  });
});
