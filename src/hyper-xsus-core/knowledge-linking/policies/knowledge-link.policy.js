/**
 * XSUS Hyper Core — KnowledgeLink Policy
 * Version: 1.0.0
 *
 * Përcakton rregullat e pranimit të KnowledgeLink.
 * Nuk krijon, ruan apo kërkon lidhje.
 */

import {
  KNOWLEDGE_LINK_RELATION_TYPES,
} from "../models/knowledge-link.js";

export const KNOWLEDGE_LINK_POLICY_VERSION = "1.0.0";

export const KNOWLEDGE_LINK_POLICY_DECISIONS = Object.freeze({
  ALLOW: "allow",
  DENY: "deny",
});

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function requireNonEmptyString(value, field) {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new TypeError(
      `${field} must be a non-empty string.`,
    );
  }

  return value.trim();
}

function validateRelationTypes(value) {
  if (value === undefined) {
    return Object.freeze([
      ...KNOWLEDGE_LINK_RELATION_TYPES,
    ]);
  }

  if (!Array.isArray(value)) {
    throw new TypeError(
      "allowedRelationTypes must be an array.",
    );
  }

  const normalized = value.map((item) => {
    const relationType = requireNonEmptyString(
      item,
      "allowedRelationTypes item",
    );

    if (
      !KNOWLEDGE_LINK_RELATION_TYPES.includes(
        relationType,
      )
    ) {
      throw new TypeError(
        `Unsupported relation type: ${relationType}.`,
      );
    }

    return relationType;
  });

  return Object.freeze([...new Set(normalized)]);
}

function validateConfidence(value) {
  if (
    value !== undefined &&
    (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > 1
    )
  ) {
    throw new TypeError(
      "minimumConfidence must be between 0 and 1.",
    );
  }

  return value ?? 0;
}

export function createKnowledgeLinkPolicy(input = {}) {
  if (!isPlainObject(input)) {
    throw new TypeError(
      "Policy input must be a plain object.",
    );
  }

  const allowedRelationTypes =
    validateRelationTypes(input.allowedRelationTypes);

  const minimumConfidence =
    validateConfidence(input.minimumConfidence);

  const allowSelfLinks = input.allowSelfLinks ?? false;

  if (typeof allowSelfLinks !== "boolean") {
    throw new TypeError(
      "allowSelfLinks must be a boolean.",
    );
  }

  return Object.freeze({
    version: KNOWLEDGE_LINK_POLICY_VERSION,
    allowedRelationTypes,
    minimumConfidence,
    allowSelfLinks,
  });
}

export function evaluateKnowledgeLinkPolicy(
  link,
  policyInput = {},
) {
  if (!isPlainObject(link)) {
    throw new TypeError(
      "KnowledgeLink must be a plain object.",
    );
  }

  const policy = createKnowledgeLinkPolicy(policyInput);
  const reasons = [];

  if (
    typeof link.id !== "string" ||
    link.id.trim().length === 0
  ) {
    reasons.push("INVALID_ID");
  }

  if (
    typeof link.sourceId !== "string" ||
    link.sourceId.trim().length === 0
  ) {
    reasons.push("INVALID_SOURCE_ID");
  }

  if (
    typeof link.targetId !== "string" ||
    link.targetId.trim().length === 0
  ) {
    reasons.push("INVALID_TARGET_ID");
  }

  if (
    typeof link.sourceId === "string" &&
    typeof link.targetId === "string" &&
    link.sourceId.trim() === link.targetId.trim() &&
    !policy.allowSelfLinks
  ) {
    reasons.push("SELF_LINK_NOT_ALLOWED");
  }

  if (
    !policy.allowedRelationTypes.includes(
      link.relationType,
    )
  ) {
    reasons.push("RELATION_TYPE_NOT_ALLOWED");
  }

  if (
    typeof link.confidence !== "number" ||
    !Number.isFinite(link.confidence) ||
    link.confidence < policy.minimumConfidence ||
    link.confidence > 1
  ) {
    reasons.push("CONFIDENCE_BELOW_POLICY");
  }

  return Object.freeze({
    decision: reasons.length === 0
      ? KNOWLEDGE_LINK_POLICY_DECISIONS.ALLOW
      : KNOWLEDGE_LINK_POLICY_DECISIONS.DENY,
    allowed: reasons.length === 0,
    reasons: Object.freeze(reasons),
    policyVersion: policy.version,
  });
}
