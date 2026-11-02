import { describe, it, expect } from "vitest";

import {
  KNOWLEDGE_LINK_VALIDATOR_VERSION,
  KNOWLEDGE_LINK_VALIDATION_ERROR_CODES,
  validateKnowledgeLink,
} from "../../../validators/knowledge-link.validator.js";

function createValidKnowledgeLink(overrides = {}) {
  return {
    id: "link-validator-001",
    sourceId: "knowledge-source",
    targetId: "knowledge-target",
    relationType: "related_to",
    confidence: 0.95,
    createdAt: "2026-11-02T08:00:00.000Z",
    metadata: {},
    ...overrides,
  };
}

describe("KnowledgeLink Validator", () => {
  it("ekspozon versionin e validatorit", () => {
    expect(KNOWLEDGE_LINK_VALIDATOR_VERSION).toBe("1.0.0");
  });

  it("pranon një KnowledgeLink të vlefshëm", () => {
    const result = validateKnowledgeLink(
      createValidKnowledgeLink(),
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("refuzon null", () => {
    const result = validateKnowledgeLink(null);

    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe(
      KNOWLEDGE_LINK_VALIDATION_ERROR_CODES.INVALID_INPUT,
    );
  });

  it("refuzon ID bosh", () => {
    const result = validateKnowledgeLink(
      createValidKnowledgeLink({ id: " " }),
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: KNOWLEDGE_LINK_VALIDATION_ERROR_CODES.INVALID_ID,
        field: "id",
      }),
    );
  });

  it("refuzon sourceId bosh", () => {
    const result = validateKnowledgeLink(
      createValidKnowledgeLink({ sourceId: "" }),
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: KNOWLEDGE_LINK_VALIDATION_ERROR_CODES.INVALID_SOURCE_ID,
      }),
    );
  });

  it("refuzon targetId bosh", () => {
    const result = validateKnowledgeLink(
      createValidKnowledgeLink({ targetId: "" }),
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: KNOWLEDGE_LINK_VALIDATION_ERROR_CODES.INVALID_TARGET_ID,
      }),
    );
  });

  it("refuzon sourceId dhe targetId identike", () => {
    const result = validateKnowledgeLink(
      createValidKnowledgeLink({
        sourceId: "same-id",
        targetId: " same-id ",
      }),
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: KNOWLEDGE_LINK_VALIDATION_ERROR_CODES.SAME_SOURCE_AND_TARGET,
      }),
    );
  });

  it("refuzon relationType të pambështetur", () => {
    const result = validateKnowledgeLink(
      createValidKnowledgeLink({
        relationType: "unknown_relation",
      }),
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: KNOWLEDGE_LINK_VALIDATION_ERROR_CODES.INVALID_RELATION_TYPE,
      }),
    );
  });

  it.each([-1, 1.1, NaN, Infinity, "0.5", null])(
    "refuzon confidence të pavlefshme: %s",
    (confidence) => {
      const result = validateKnowledgeLink(
        createValidKnowledgeLink({ confidence }),
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: KNOWLEDGE_LINK_VALIDATION_ERROR_CODES.INVALID_CONFIDENCE,
        }),
      );
    },
  );

  it("pranon confidence në kufijtë 0 dhe 1", () => {
    for (const confidence of [0, 1]) {
      const result = validateKnowledgeLink(
        createValidKnowledgeLink({ confidence }),
      );

      expect(result.valid).toBe(true);
    }
  });

  it("refuzon createdAt të pavlefshme", () => {
    const result = validateKnowledgeLink(
      createValidKnowledgeLink({
        createdAt: "not-a-date",
      }),
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: KNOWLEDGE_LINK_VALIDATION_ERROR_CODES.INVALID_CREATED_AT,
      }),
    );
  });

  it("refuzon metadata që nuk është objekt", () => {
    const result = validateKnowledgeLink(
      createValidKnowledgeLink({
        metadata: [],
      }),
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: KNOWLEDGE_LINK_VALIDATION_ERROR_CODES.INVALID_METADATA,
      }),
    );
  });

  it("raporton disa gabime në të njëjtin rezultat", () => {
    const result = validateKnowledgeLink({
      id: "",
      sourceId: "",
      targetId: "",
      relationType: "invalid",
      confidence: 2,
      createdAt: "invalid-date",
      metadata: [],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });

  it("nuk ndryshon objektin hyrës", () => {
    const link = createValidKnowledgeLink();
    const original = structuredClone(link);

    validateKnowledgeLink(link);

    expect(link).toEqual(original);
  });

  it("kthen rezultat dhe listë gabimesh të pandryshueshme", () => {
    const result = validateKnowledgeLink(
      createValidKnowledgeLink(),
    );

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.errors)).toBe(true);
  });
});
