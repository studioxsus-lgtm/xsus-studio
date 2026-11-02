/**
 * Hyper XSUS Core
 * KnowledgeLink Resolver
 *
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Kërkimi sipas sourceId.
 * - Kërkimi sipas targetId.
 * - Kërkimi sipas relationType.
 * - Kërkimi ndërmjet dy elementeve.
 * - Identifikimi i lidhjeve reciproke.
 * - Kthimi i rezultateve të standardizuara.
 *
 * Ky komponent është pa databazë dhe pa varësi të jashtme.
 */

export const KNOWLEDGE_LINK_RESOLVER_VERSION = "1.0.0";

function isPlainObject(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function requireNonEmptyString(value, fieldName) {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new TypeError(
      `${fieldName} duhet të jetë tekst jo bosh.`,
    );
  }

  return value.trim();
}

function validateLinks(links) {
  if (!Array.isArray(links)) {
    throw new TypeError(
      "links duhet të jetë array.",
    );
  }

  for (const link of links) {
    if (!isPlainObject(link)) {
      throw new TypeError(
        "Çdo KnowledgeLink duhet të jetë objekt i vlefshëm.",
      );
    }

    if (
      typeof link.id !== "string" ||
      link.id.trim().length === 0 ||
      typeof link.sourceId !== "string" ||
      link.sourceId.trim().length === 0 ||
      typeof link.targetId !== "string" ||
      link.targetId.trim().length === 0 ||
      typeof link.relationType !== "string" ||
      link.relationType.trim().length === 0
    ) {
      throw new TypeError(
        "KnowledgeLink nuk përmban identifikuesit dhe relationType të vlefshme.",
      );
    }
  }

  return links;
}

function createResult(links) {
  return Object.freeze({
    count: links.length,
    links: Object.freeze([...links]),
  });
}

/**
 * Kërkon lidhjet sipas sourceId.
 */
export function findKnowledgeLinksBySourceId(
  links,
  sourceId,
) {
  validateLinks(links);

  const normalizedSourceId = requireNonEmptyString(
    sourceId,
    "sourceId",
  );

  return createResult(
    links.filter(
      (link) => link.sourceId.trim() === normalizedSourceId,
    ),
  );
}

/**
 * Kërkon lidhjet sipas targetId.
 */
export function findKnowledgeLinksByTargetId(
  links,
  targetId,
) {
  validateLinks(links);

  const normalizedTargetId = requireNonEmptyString(
    targetId,
    "targetId",
  );

  return createResult(
    links.filter(
      (link) => link.targetId.trim() === normalizedTargetId,
    ),
  );
}

/**
 * Kërkon lidhjet sipas relationType.
 */
export function findKnowledgeLinksByRelationType(
  links,
  relationType,
) {
  validateLinks(links);

  const normalizedRelationType = requireNonEmptyString(
    relationType,
    "relationType",
  );

  return createResult(
    links.filter(
      (link) =>
        link.relationType.trim() === normalizedRelationType,
    ),
  );
}

/**
 * Kërkon lidhjet ndërmjet dy elementeve.
 *
 * Drejtimi i kërkimit përcaktohet nga sourceId
 * dhe targetId, sipas rendit të dhënë.
 */
export function findKnowledgeLinksBetween(
  links,
  sourceId,
  targetId,
) {
  validateLinks(links);

  const normalizedSourceId = requireNonEmptyString(
    sourceId,
    "sourceId",
  );

  const normalizedTargetId = requireNonEmptyString(
    targetId,
    "targetId",
  );

  return createResult(
    links.filter(
      (link) =>
        link.sourceId.trim() === normalizedSourceId &&
        link.targetId.trim() === normalizedTargetId,
    ),
  );
}

/**
 * Identifikon lidhjet reciproke.
 *
 * Një lidhje konsiderohet reciproke kur ekziston
 * edhe lidhja në drejtimin e kundërt.
 */
export function findReciprocalKnowledgeLinks(
  links,
) {
  validateLinks(links);

  const reciprocalLinks = links.filter((link) =>
    links.some(
      (candidate) =>
        candidate.id !== link.id &&
        candidate.sourceId.trim() === link.targetId.trim() &&
        candidate.targetId.trim() === link.sourceId.trim(),
    ),
  );

  return createResult(reciprocalLinks);
}

/**
 * Kërkon të gjitha lidhjet që prekin një element.
 *
 * Përfshin si sourceId, ashtu edhe targetId.
 */
export function findKnowledgeLinksByEntityId(
  links,
  entityId,
) {
  validateLinks(links);

  const normalizedEntityId = requireNonEmptyString(
    entityId,
    "entityId",
  );

  return createResult(
    links.filter(
      (link) =>
        link.sourceId.trim() === normalizedEntityId ||
        link.targetId.trim() === normalizedEntityId,
    ),
  );
}

/**
 * Resolver i përgjithshëm me filtra opsionalë.
 */
export function resolveKnowledgeLinks(
  links,
  filters = {},
) {
  validateLinks(links);

  if (!isPlainObject(filters)) {
    throw new TypeError(
      "filters duhet të jetë objekt i vlefshëm.",
    );
  }

  const {
    sourceId,
    targetId,
    relationType,
    entityId,
  } = filters;

  let resolvedLinks = [...links];

  if (sourceId !== undefined) {
    const value = requireNonEmptyString(
      sourceId,
      "sourceId",
    );

    resolvedLinks = resolvedLinks.filter(
      (link) => link.sourceId.trim() === value,
    );
  }

  if (targetId !== undefined) {
    const value = requireNonEmptyString(
      targetId,
      "targetId",
    );

    resolvedLinks = resolvedLinks.filter(
      (link) => link.targetId.trim() === value,
    );
  }

  if (relationType !== undefined) {
    const value = requireNonEmptyString(
      relationType,
      "relationType",
    );

    resolvedLinks = resolvedLinks.filter(
      (link) => link.relationType.trim() === value,
    );
  }

  if (entityId !== undefined) {
    const value = requireNonEmptyString(
      entityId,
      "entityId",
    );

    resolvedLinks = resolvedLinks.filter(
      (link) =>
        link.sourceId.trim() === value ||
        link.targetId.trim() === value,
    );
  }

  return createResult(resolvedLinks);
}
