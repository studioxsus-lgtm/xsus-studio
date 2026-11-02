import {
  describe,
  it,
  expect,
} from "vitest";

import {
  verifyKnowledgeLinkIndexes,
  rebuildKnowledgeLinkIndexes,
  recoverKnowledgeLinkIndexes,
  KNOWLEDGE_LINK_INDEX_INTEGRITY_VERSION,
} from "../../../engines/knowledge-link.index-integrity.js";

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

function addToIndex(index, value, id) {
  let ids = index.get(value);

  if (!ids) {
    ids = new Set();
    index.set(value, ids);
  }

  ids.add(id);
}

function createIndexes(links) {
  const indexes = {
    sourceIdIndex: new Map(),
    targetIdIndex: new Map(),
    relationTypeIndex: new Map(),
  };

  for (const [id, link] of links) {
    addToIndex(
      indexes.sourceIdIndex,
      link.sourceId,
      id,
    );

    addToIndex(
      indexes.targetIdIndex,
      link.targetId,
      id,
    );

    addToIndex(
      indexes.relationTypeIndex,
      link.relationType,
      id,
    );
  }

  return indexes;
}

function snapshotIndexes(indexes) {
  return Object.fromEntries(
    Object.entries(indexes).map(([name, index]) => [
      name,
      [...index.entries()].map(([value, ids]) => [
        value,
        ids instanceof Set ? [...ids] : ids,
      ]),
    ]),
  );
}

function createFailOnceMap(initialEntries = []) {
  const index = new Map(initialEntries);

  let shouldFail = false;

  const originalSet = index.set.bind(index);

  index.set = (key, value) => {
    if (shouldFail) {
      shouldFail = false;

      throw new Error("Simulated index write failure.");
    }

    return originalSet(key, value);
  };

  index.failNextWrite = () => {
    shouldFail = true;
  };

  return index;
}

describe(
  "XSUS Hyper Core — KnowledgeLink Index Integrity Failure Resilience",
  () => {
    it("ruan versionin e Index Integrity Manager", () => {
      expect(
        KNOWLEDGE_LINK_INDEX_INTEGRITY_VERSION,
      ).toBe("1.0.0");
    });

    it("nuk ndryshon indekset kur integriteti është i saktë", () => {
      const links = new Map([
        ["link-1", createLink("link-1")],
        [
          "link-2",
          createLink("link-2", {
            sourceId: "source-b",
          }),
        ],
      ]);

      const indexes = createIndexes(links);
      const before = snapshotIndexes(indexes);

      const recovery = recoverKnowledgeLinkIndexes({
        links,
        indexes,
      });

      expect(recovery.success).toBe(true);
      expect(recovery.recovered).toBe(false);
      expect(recovery.rebuild).toBeNull();
      expect(recovery.before.valid).toBe(true);
      expect(recovery.after.valid).toBe(true);

      expect(snapshotIndexes(indexes)).toEqual(before);
    });

    it("raporton gjendjen e dëmtuar përpara rikuperimit", () => {
      const links = new Map([
        ["link-1", createLink("link-1")],
      ]);

      const indexes = createIndexes(links);

      indexes.sourceIdIndex.clear();

      const verification = verifyKnowledgeLinkIndexes({
        links,
        indexes,
      });

      expect(verification.valid).toBe(false);
      expect(verification.missingEntries).toHaveLength(1);
      expect(verification.missingEntries[0]).toMatchObject({
        index: "sourceId",
        value: "source-a",
        id: "link-1",
      });
    });

    it("rikthen indekset dhe ruan koleksionin kryesor", () => {
      const links = new Map([
        ["link-1", createLink("link-1")],
        [
          "link-2",
          createLink("link-2", {
            targetId: "target-b",
            relationType: "depends_on",
          }),
        ],
      ]);

      const indexes = createIndexes(links);
      const originalLinks = [...links.entries()];

      indexes.sourceIdIndex.clear();
      indexes.targetIdIndex.set(
        "obsolete-target",
        new Set(["missing-link"]),
      );

      const recovery = recoverKnowledgeLinkIndexes({
        links,
        indexes,
      });

      expect(recovery.success).toBe(true);
      expect(recovery.recovered).toBe(true);
      expect(recovery.before.valid).toBe(false);
      expect(recovery.after.valid).toBe(true);
      expect(recovery.rebuild.success).toBe(true);

      expect([...links.entries()]).toEqual(originalLinks);

      expect(
        verifyKnowledgeLinkIndexes({
          links,
          indexes,
        }).valid,
      ).toBe(true);
    });

    it("raporton dështimin gjatë shkrimit në indeks", () => {
      const links = new Map([
        ["link-1", createLink("link-1")],
        [
          "link-2",
          createLink("link-2", {
            sourceId: "source-b",
          }),
        ],
      ]);

      const indexes = createIndexes(links);

      indexes.sourceIdIndex.clear();

      indexes.targetIdIndex = createFailOnceMap(
        indexes.targetIdIndex.entries(),
      );

      indexes.targetIdIndex.failNextWrite();

      const originalLinks = [...links.entries()];

      const recovery = recoverKnowledgeLinkIndexes({
        links,
        indexes,
      });

      expect(recovery.success).toBe(false);
      expect(recovery.recovered).toBe(false);
      expect(recovery.before.valid).toBe(false);
      expect(recovery.after).toBeNull();
      expect(recovery.rebuild).toBeNull();

      expect(recovery.error.code).toBe(
        "KNOWLEDGE_LINK_INDEX_RECOVERY_FAILED",
      );

      expect(recovery.error.message).toBe(
        "Simulated index write failure.",
      );

      expect([...links.entries()]).toEqual(originalLinks);
    });

    it("rikthen përmbajtjen e indekseve kur rindërtimi dështon", () => {
      const links = new Map([
        ["link-1", createLink("link-1")],
        [
          "link-2",
          createLink("link-2", {
            sourceId: "source-b",
          }),
        ],
      ]);

      const indexes = createIndexes(links);

      indexes.sourceIdIndex.clear();

      indexes.targetIdIndex = createFailOnceMap(
        indexes.targetIdIndex.entries(),
      );

      const before = snapshotIndexes(indexes);

      indexes.targetIdIndex.failNextWrite();

      expect(() => {
        rebuildKnowledgeLinkIndexes({
          links,
          indexes,
        });
      }).toThrow(
        "Simulated index write failure.",
      );

      expect(snapshotIndexes(indexes)).toEqual(before);
    });

    it("nuk ndryshon koleksionin kryesor kur rindërtimi dështon", () => {
      const links = new Map([
        ["link-1", createLink("link-1")],
        [
          "link-2",
          createLink("link-2", {
            targetId: "target-b",
          }),
        ],
      ]);

      const indexes = createIndexes(links);
      const originalLinks = [...links.entries()];

      indexes.sourceIdIndex.clear();

      indexes.targetIdIndex = createFailOnceMap(
        indexes.targetIdIndex.entries(),
      );

      indexes.targetIdIndex.failNextWrite();

      expect(() => {
        rebuildKnowledgeLinkIndexes({
          links,
          indexes,
        });
      }).toThrow();

      expect([...links.entries()]).toEqual(originalLinks);
    });

    it("propagon gabimin kur koleksioni kryesor ka ID të papërputhur", () => {
      const links = new Map([
        [
          "stored-link-id",
          createLink("different-link-id"),
        ],
      ]);

      const indexes = createIndexes(new Map());

      expect(() => {
        recoverKnowledgeLinkIndexes({
          links,
          indexes,
        });
      }).toThrow(
        "KnowledgeLink ID mismatch: stored-link-id.",
      );
    });

    it("refuzon koleksionin kryesor me lidhje të pavlefshme", () => {
      const links = new Map([
        ["link-1", null],
      ]);

      const indexes = createIndexes(new Map());

      expect(() => {
        recoverKnowledgeLinkIndexes({
          links,
          indexes,
        });
      }).toThrow(
        "Invalid KnowledgeLink stored under ID: link-1.",
      );
    });

    it("lejon rikuperim të suksesshëm pas një dështimi të përkohshëm", () => {
      const links = new Map([
        ["link-1", createLink("link-1")],
        [
          "link-2",
          createLink("link-2", {
            relationType: "depends_on",
          }),
        ],
      ]);

      const indexes = createIndexes(links);

      indexes.sourceIdIndex.clear();

      indexes.targetIdIndex = createFailOnceMap(
        indexes.targetIdIndex.entries(),
      );

      indexes.targetIdIndex.failNextWrite();

      const firstRecovery = recoverKnowledgeLinkIndexes({
        links,
        indexes,
      });

      expect(firstRecovery.success).toBe(false);

      const secondRecovery = recoverKnowledgeLinkIndexes({
        links,
        indexes,
      });

      expect(secondRecovery.success).toBe(true);
      expect(secondRecovery.recovered).toBe(true);
      expect(secondRecovery.after.valid).toBe(true);
    });
  },
);
