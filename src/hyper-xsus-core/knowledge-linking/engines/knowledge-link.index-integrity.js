/**
 * XSUS Hyper Core — KnowledgeLink Index Integrity Manager
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Verifikimi i integritetit të indekseve.
 * - Zbulimi i ID-ve që mungojnë dhe atyre të tepërta.
 * - Zbulimi i referencave të pavlefshme.
 * - Rindërtimi dhe rikuperimi i indekseve.
 * - Raportimi para dhe pas rikuperimit.
 * - Integrimi opsional me KnowledgeLink Audit Trail.
 * - Ruajtja e koleksionit kryesor dhe API-ve ekzistuese.
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

function assertAuditTrail(auditTrail) {
  if (auditTrail === undefined || auditTrail === null) {
    return;
  }

  if (
    typeof auditTrail !== "object" ||
    typeof auditTrail.addEvent !== "function"
  ) {
    throw new TypeError(
      "auditTrail must expose an addEvent() method.",
    );
  }
}

/**
 * Auditimi është ndihmës:
 * dështimi i tij nuk ndryshon rezultatin e operacionit
 * kryesor të integritetit.
 */
function recordAuditEvent(auditTrail, event) {
  if (!auditTrail) {
    return null;
  }

  try {
    return auditTrail.addEvent(event);
  } catch {
    return null;
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

function verifySingleIndex(links, index, field, report) {
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

function verifyIndexesWithoutAudit({ links, indexes }) {
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
 * Verifikon integritetin.
 * auditTrail është opsional.
 *
 * Operacioni i verifikimit mbetet vetëm-lexues
 * ndaj koleksionit dhe indekseve.
 */
export function verifyKnowledgeLinkIndexes({
  links,
  indexes,
  auditTrail,
} = {}) {
  assertAuditTrail(auditTrail);

  let report;

  try {
    report = verifyIndexesWithoutAudit({
      links,
      indexes,
    });
  } catch (error) {
    recordAuditEvent(auditTrail, {
      type: "verification",
      status: "failure",
      details: {
        errorCode:
          error.code ??
          "KNOWLEDGE_LINK_INDEX_VERIFICATION_FAILED",
        message: error.message,
      },
    });

    throw error;
  }

  recordAuditEvent(auditTrail, {
    type: "verification",
    status: report.valid ? "success" : "failure",
    details: {
      valid: report.valid,
      checkedLinks: report.checkedLinks,
      checkedIndexes: report.checkedIndexes,
      missingCount: report.missingEntries.length,
      staleCount: report.staleEntries.length,
      invalidCount: report.invalidEntries.length,
    },
  });

  return report;
}

/**
 * Rindërton indekset nga koleksioni kryesor.
 *
 * Indekset përgatiten dhe verifikohen përpara
 * ndryshimit të indekseve aktive.
 *
 * Koleksioni kryesor nuk modifikohet.
 * Objektet Map aktive ruhen.
 */
export function rebuildKnowledgeLinkIndexes({
  links,
  indexes,
  auditTrail,
} = {}) {
  assertAuditTrail(auditTrail);

  try {
    assertLinkCollection(links);
    assertIndexes(indexes);

    const stagedIndexes = buildIndexMaps(links);

    const stagedVerification = verifyIndexesWithoutAudit({
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

    // Snapshot i gjendjes ekzistuese.
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

      const verification = verifyIndexesWithoutAudit({
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

      const result = Object.freeze({
        success: true,
        version: KNOWLEDGE_LINK_INDEX_INTEGRITY_VERSION,
        rebuiltLinks: links.size,
        rebuiltIndexes: Object.freeze(rebuiltIndexes),
        verification,
      });

      // Regjistrimi bëhet pas përfundimit të rindërtimit.
      recordAuditEvent(auditTrail, {
        type: "rebuild",
        status: "success",
        details: {
          rebuiltLinks: result.rebuiltLinks,
          rebuiltIndexes: result.rebuiltIndexes,
          verificationValid: verification.valid,
        },
      });

      return result;
    } catch (error) {
      // Rikthimi i gjendjes së mëparshme.
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
  } catch (error) {
    recordAuditEvent(auditTrail, {
      type: "rebuild",
      status: "failure",
      details: {
        errorCode:
          error.code ??
          "KNOWLEDGE_LINK_INDEX_REBUILD_FAILED",
        message: error.message,
      },
    });

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
 * 5. Kthen raportin para dhe pas rikuperimit.
 */
export function recoverKnowledgeLinkIndexes({
  links,
  indexes,
  auditTrail,
} = {}) {
  assertAuditTrail(auditTrail);

  let before;

  try {
    before = verifyKnowledgeLinkIndexes({
      links,
      indexes,
      auditTrail,
    });
  } catch (error) {
    recordAuditEvent(auditTrail, {
      type: "recovery",
      status: "failure",
      details: {
        errorCode:
          error.code ??
          "KNOWLEDGE_LINK_INDEX_RECOVERY_FAILED",
        message: error.message,
      },
    });

    throw error;
  }

  if (before.valid) {
    const result = Object.freeze({
      success: true,
      recovered: false,
      version: KNOWLEDGE_LINK_INDEX_INTEGRITY_VERSION,
      before,
      after: before,
      rebuild: null,
    });

    recordAuditEvent(auditTrail, {
      type: "recovery",
      status: "success",
      details: {
        recovered: false,
        beforeValid: true,
        afterValid: true,
      },
    });

    return result;
  }

  try {
    const rebuild = rebuildKnowledgeLinkIndexes({
      links,
      indexes,
      auditTrail,
    });

    const after = verifyKnowledgeLinkIndexes({
      links,
      indexes,
      auditTrail,
    });

    if (!after.valid) {
      const result = Object.freeze({
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

      recordAuditEvent(auditTrail, {
        type: "recovery",
        status: "failure",
        details: {
          recovered: false,
          beforeValid: before.valid,
          afterValid: after.valid,
          errorCode: result.error.code,
        },
      });

      return result;
    }

    const result = Object.freeze({
      success: true,
      recovered: true,
      version: KNOWLEDGE_LINK_INDEX_INTEGRITY_VERSION,
      before,
      after,
      rebuild,
    });

    recordAuditEvent(auditTrail, {
      type: "recovery",
      status: "success",
      details: {
        recovered: true,
        beforeValid: before.valid,
        afterValid: after.valid,
      },
    });

    return result;
  } catch (error) {
    const result = Object.freeze({
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

    recordAuditEvent(auditTrail, {
      type: "recovery",
      status: "failure",
      details: {
        recovered: false,
        beforeValid: before.valid,
        errorCode: result.error.code,
        message: result.error.message,
      },
    });

    return result;
  }
}
