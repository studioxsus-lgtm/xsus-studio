/**
 * XSUS Hyper Core — KnowledgeLink Index Integrity Manager
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Verifikimi i integritetit të indekseve.
 * - Zbulimi i ID-ve që mungojnë.
 * - Zbulimi i ID-ve të tepërta.
 * - Zbulimi i referencave të pavlefshme.
 * - Rindërtimi i indekseve nga koleksioni kryesor.
 * - Rikuperimi automatik i indekseve.
 * - Raportimi para dhe pas rikuperimit.
 * - Ruajtja e konsistencës së sourceId, targetId
 *   dhe relationType.
 * - Mbrojtja e koleksionit kryesor gjatë rikuperimit.
 */

export const KNOWLEDGE_LINK_INDEX_INTEGRITY_VERSION = "1.0.0";

const INDEX_FIELDS = Object.freeze([
  Object.freeze({
    name: "sourceId",
    property: "sourceId",
    indexName: "sourceIdIndex",
  }),
  Object.freeze({
    name: "targetId",
    property: "targetId",
    indexName: "targetIdIndex",
  }),
  Object.freeze({
    name: "relationType",
    property: "relationType",
    indexName: "relationTypeIndex",
  }),
]);

function assertMap(value, name) {
  if (!(value instanceof Map)) {
    throw new TypeError(`${name} must be a Map.`);
  }
}

function assertLinkCollection(links) {
  assertMap(links, "links");

  for (const [id, link] of links) {
    if (
      link === null ||
      typeof link !== "object" ||
      Array.isArray(link)
    ) {
      throw new TypeError(
        `Invalid KnowledgeLink stored under ID: ${id}.`,
      );
    }

    if (link.id !== id) {
      throw new TypeError(
        `KnowledgeLink ID mismatch: ${id}.`,
      );
    }

    for (const field of INDEX_FIELDS) {
      const value = link[field.property];

      if (
        typeof value !== "string" ||
        value.trim().length === 0
      ) {
        throw new TypeError(
          `Invalid ${field.property} in KnowledgeLink: ${id}.`,
        );
      }
    }
  }
}

function assertIndexes(indexes) {
  if (
    indexes === null ||
    typeof indexes !== "object" ||
    Array.isArray(indexes)
  ) {
    throw new TypeError("indexes must be an object.");
  }

  for (const field of INDEX_FIELDS) {
    assertMap(
      indexes[field.indexName],
      field.indexName,
    );
  }
}

function createEmptyReport() {
  return {
    valid: true,
    checkedLinks: 0,
    checkedIndexes: 0,
    missingEntries: [],
    staleEntries: [],
    invalidEntries: [],
  };
}

function freezeReport(report) {
  return Object.freeze({
    valid: report.valid,
    checkedLinks: report.checkedLinks,
    checkedIndexes: report.checkedIndexes,

    missingEntries: Object.freeze(
      report.missingEntries.map((entry) =>
        Object.freeze({ ...entry }),
      ),
    ),

    staleEntries: Object.freeze(
      report.staleEntries.map((entry) =>
        Object.freeze({ ...entry }),
      ),
    ),

    invalidEntries: Object.freeze(
      report.invalidEntries.map((entry) =>
        Object.freeze({ ...entry }),
      ),
    ),
  });
}

function createIndexMaps() {
  return {
    sourceIdIndex: new Map(),
    targetIdIndex: new Map(),
    relationTypeIndex: new Map(),
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

/**
 * Kontrollon një indeks kundrejt koleksionit kryesor.
 */
function verifySingleIndex(
  links,
  index,
  field,
  report,
) {
  report.checkedIndexes += 1;

  const expectedEntries = new Map();

  for (const [id, link] of links) {
    const value = link[field.property];

    let expectedIds = expectedEntries.get(value);

    if (!expectedIds) {
      expectedIds = new Set();
      expectedEntries.set(value, expectedIds);
    }

    expectedIds.add(id);
  }

  // Hyrjet që mungojnë.
  for (const [value, expectedIds] of expectedEntries) {
    const actualIds = index.get(value);

    for (const id of expectedIds) {
      if (!actualIds || !actualIds.has(id)) {
        report.missingEntries.push({
          index: field.name,
          value,
          id,
        });
      }
    }
  }

  // Hyrjet e tepërta dhe të pavlefshme.
  for (const [value, actualIds] of index) {
    if (!(actualIds instanceof Set)) {
      report.invalidEntries.push({
        index: field.name,
        value,
        reason: "INDEX_VALUE_MUST_BE_SET",
      });

      continue;
    }

    if (actualIds.size === 0) {
      report.invalidEntries.push({
        index: field.name,
        value,
        reason: "EMPTY_INDEX_SET",
      });

      continue;
    }

    for (const id of actualIds) {
      const link = links.get(id);

      if (!link) {
        report.staleEntries.push({
          index: field.name,
          value,
          id,
          reason: "LINK_NOT_FOUND",
        });

        continue;
      }

      if (link[field.property] !== value) {
        report.staleEntries.push({
          index: field.name,
          value,
          id,
          reason: "INDEX_VALUE_MISMATCH",
        });
      }
    }
  }
}

/**
 * Përgatit indekse të reja pa ndryshuar indekset aktive.
 */
function buildIndexMaps(links) {
  const stagedIndexes = createIndexMaps();

  for (const [id, link] of links) {
    addToIndex(
      stagedIndexes.sourceIdIndex,
      link.sourceId,
      id,
    );

    addToIndex(
      stagedIndexes.targetIdIndex,
      link.targetId,
      id,
    );

    addToIndex(
      stagedIndexes.relationTypeIndex,
      link.relationType,
      id,
    );
  }

  return stagedIndexes;
}

/**
 * Verifikon integritetin e të tre indekseve.
 *
 * Operacion vetëm-lexues.
 * Nuk ndryshon koleksionin kryesor ose indekset.
 */
export function verifyKnowledgeLinkIndexes({
  links,
  indexes,
} = {}) {
  assertLinkCollection(links);
  assertIndexes(indexes);

  const report = createEmptyReport();

  report.checkedLinks = links.size;

  for (const field of INDEX_FIELDS) {
    verifySingleIndex(
      links,
      indexes[field.indexName],
      field,
      report,
    );
  }

  report.valid =
    report.missingEntries.length === 0 &&
    report.staleEntries.length === 0 &&
    report.invalidEntries.length === 0;

  return freezeReport(report);
}

/**
 * Rindërton indekset nga koleksioni kryesor.
 *
 * Indekset e reja përgatiten dhe verifikohen
 * përpara se të ndryshohen indekset aktive.
 *
 * Koleksioni kryesor nuk modifikohet.
 * Renditja e lidhjeve nuk modifikohet.
 */
export function rebuildKnowledgeLinkIndexes({
  links,
  indexes,
} = {}) {
  assertLinkCollection(links);
  assertIndexes(indexes);

  const stagedIndexes = buildIndexMaps(links);

  // Verifikimi kryhet përpara ndryshimit të indekseve aktive.
  const stagedVerification = verifyKnowledgeLinkIndexes({
    links,
    indexes: stagedIndexes,
  });

  if (!stagedVerification.valid) {
    const error = new Error(
      "KnowledgeLink index reconstruction failed.",
    );

    error.code =
      "KNOWLEDGE_LINK_INDEX_REBUILD_FAILED";

    error.details = stagedVerification;

    throw error;
  }

  // Ruajmë gjendjen ekzistuese për rikthim në rast dështimi.
  const previousIndexes = {};

  for (const field of INDEX_FIELDS) {
    const index = indexes[field.indexName];

    previousIndexes[field.indexName] = new Map(
      [...index.entries()].map(([value, ids]) => [
        value,
        ids instanceof Set ? new Set(ids) : ids,
      ]),
    );
  }

  try {
    // Zëvendësimi i përmbajtjes së indekseve.
    for (const field of INDEX_FIELDS) {
      const activeIndex = indexes[field.indexName];
      const stagedIndex = stagedIndexes[field.indexName];

      activeIndex.clear();

      for (const [value, ids] of stagedIndex) {
        activeIndex.set(value, new Set(ids));
      }
    }

    const verification = verifyKnowledgeLinkIndexes({
      links,
      indexes,
    });

    if (!verification.valid) {
      const error = new Error(
        "KnowledgeLink index verification failed after rebuild.",
      );

      error.code =
        "KNOWLEDGE_LINK_INDEX_POST_REBUILD_FAILED";

      error.details = verification;

      throw error;
    }

    const rebuiltIndexes = {};

    for (const field of INDEX_FIELDS) {
      rebuiltIndexes[field.name] =
        indexes[field.indexName].size;
    }

    return Object.freeze({
      success: true,
      version: KNOWLEDGE_LINK_INDEX_INTEGRITY_VERSION,
      rebuiltLinks: links.size,
      rebuiltIndexes: Object.freeze(rebuiltIndexes),
      verification,
    });
  } catch (error) {
    // Rikthejmë përmbajtjen e mëparshme të indekseve.
    for (const field of INDEX_FIELDS) {
      const activeIndex = indexes[field.indexName];

      activeIndex.clear();

      for (
        const [value, ids] of
        previousIndexes[field.indexName]
      ) {
        activeIndex.set(
          value,
          ids instanceof Set ? new Set(ids) : ids,
        );
      }
    }

    throw error;
  }
}

/**
 * Rikuperon automatikisht integritetin e indekseve.
 *
 * 1. Verifikon gjendjen fillestare.
 * 2. Nëse indekset janë të sakta, nuk i ndryshon.
 * 3. Nëse ka mospërputhje, rindërton indekset.
 * 4. Verifikon gjendjen përfundimtare.
 * 5. Kthen raport të plotë të procesit.
 *
 * Gabimet e validimit të koleksionit kryesor
 * propagohen, sepse koleksioni kryesor është burimi
 * autoritativ dhe nuk duhet të korrigjohet automatikisht.
 */
export function recoverKnowledgeLinkIndexes({
  links,
  indexes,
} = {}) {
  const before = verifyKnowledgeLinkIndexes({
    links,
    indexes,
  });

  // Nuk nevojitet rikuperim.
  if (before.valid) {
    return Object.freeze({
      success: true,
      recovered: false,
      version: KNOWLEDGE_LINK_INDEX_INTEGRITY_VERSION,
      before,
      after: before,
      rebuild: null,
    });
  }

  try {
    const rebuild = rebuildKnowledgeLinkIndexes({
      links,
      indexes,
    });

    const after = verifyKnowledgeLinkIndexes({
      links,
      indexes,
    });

    if (!after.valid) {
      return Object.freeze({
        success: false,
        recovered: false,
        version: KNOWLEDGE_LINK_INDEX_INTEGRITY_VERSION,
        before,
        after,
        rebuild,
        error: Object.freeze({
          code: "KNOWLEDGE_LINK_INDEX_RECOVERY_FAILED",
          message:
            "Index integrity could not be restored.",
        }),
      });
    }

    return Object.freeze({
      success: true,
      recovered: true,
      version: KNOWLEDGE_LINK_INDEX_INTEGRITY_VERSION,
      before,
      after,
      rebuild,
    });
  } catch (error) {
    return Object.freeze({
      success: false,
      recovered: false,
      version: KNOWLEDGE_LINK_INDEX_INTEGRITY_VERSION,
      before,
      after: null,
      rebuild: null,
      error: Object.freeze({
        code:
          error.code ??
          "KNOWLEDGE_LINK_INDEX_RECOVERY_FAILED",
        message: error.message,
      }),
    });
  }
}
