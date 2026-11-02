/**
 * XSUS Hyper Core — KnowledgeLink Index Integrity Manager
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Verifikimi i integritetit të indekseve.
 * - Zbulimi i ID-ve që mungojnë.
 * - Zbulimi i ID-ve të tepërta.
 * - Zbulimi i referencave të pavlefshme.
 * - Rikonstruktimi i indekseve nga koleksioni kryesor.
 * - Ruajtja e konsistencës së sourceId, targetId
 *   dhe relationType.
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
      if (
        typeof link[field.property] !== "string" ||
        link[field.property].trim().length === 0
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
    assertMap(indexes[field.indexName], field.indexName);
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
    missingEntries: Object.freeze([
      ...report.missingEntries,
    ]),
    staleEntries: Object.freeze([
      ...report.staleEntries,
    ]),
    invalidEntries: Object.freeze([
      ...report.invalidEntries,
    ]),
  });
}

/**
 * Kontrollon nëse një indeks përmban saktësisht
 * lidhjet që duhet të përmbajë.
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

  // Kontrolli i hyrjeve që mungojnë.
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

  // Kontrolli i hyrjeve të tepërta dhe të pavlefshme.
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
 * Verifikon integritetin e të tre indekseve.
 *
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
 * Rindërton të gjithë indekset nga koleksioni kryesor.
 *
 * Koleksioni links nuk modifikohet.
 * Rendi i futjes nuk modifikohet.
 * Map-et e indekseve ruhen dhe pastrohen në vend.
 */
export function rebuildKnowledgeLinkIndexes({
  links,
  indexes,
} = {}) {
  assertLinkCollection(links);
  assertIndexes(indexes);

  const rebuiltCounts = {};

  for (const field of INDEX_FIELDS) {
    const index = indexes[field.indexName];

    index.clear();

    for (const [id, link] of links) {
      const value = link[field.property];

      let ids = index.get(value);

      if (!ids) {
        ids = new Set();
        index.set(value, ids);
      }

      ids.add(id);
    }

    rebuiltCounts[field.name] = links.size;
  }

  const verification = verifyKnowledgeLinkIndexes({
    links,
    indexes,
  });

  if (!verification.valid) {
    const error = new Error(
      "KnowledgeLink index reconstruction failed.",
    );

    error.code =
      "KNOWLEDGE_LINK_INDEX_REBUILD_FAILED";

    error.details = verification;

    throw error;
  }

  return Object.freeze({
    success: true,
    version: KNOWLEDGE_LINK_INDEX_INTEGRITY_VERSION,
    rebuiltLinks: links.size,
    rebuiltIndexes: Object.freeze(rebuiltCounts),
    verification,
  });
}
