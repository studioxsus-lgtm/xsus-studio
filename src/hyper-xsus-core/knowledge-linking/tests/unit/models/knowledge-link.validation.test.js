import { describe, it, expect } from "vitest";

import {
  createKnowledgeLink,
  KNOWLEDGE_LINK_RELATION_TYPES,
} from "../../../models/knowledge-link.js";

function createValidInput(overrides = {}) {
  return {
    id: "link-001",
    sourceId: "knowledge-001",
    targetId: "knowledge-002",
    relationType: "supports",
    confidence: 0.95,
    createdAt: "2026-01-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("KnowledgeLink — Validation", () => {
  it("rejects non-object input", () => {
    for (const input of [null, [], "invalid", 42]) {
      expect(() => createKnowledgeLink(input)).toThrow(TypeError);
    }
  });

  it("rejects missing required fields", () => {
    for (const field of [
      "id",
      "sourceId",
      "targetId",
      "relationType",
    ]) {
      const input = createValidInput();
      delete input[field];

      expect(() => createKnowledgeLink(input)).toThrow(TypeError);
    }
  });

  it("rejects empty required fields", () => {
    for (const field of [
      "id",
      "sourceId",
      "targetId",
      "relationType",
    ]) {
      expect(() =>
        createKnowledgeLink(createValidInput({ [field]: " " })),
      ).toThrow(TypeError);
    }
  });

  it("rejects identical source and target identifiers", () => {
    expect(() =>
      createKnowledgeLink(
        createValidInput({
          targetId: "knowledge-001",
        }),
      ),
    ).toThrow(/must be different/);
  });

  it("accepts all declared relation types", () => {
    for (const relationType of KNOWLEDGE_LINK_RELATION_TYPES) {
      expect(() =>
        createKnowledgeLink(createValidInput({ relationType })),
      ).not.toThrow();
    }
  });

  it("rejects unsupported relation types", () => {
    expect(() =>
      createKnowledgeLink(
        createValidInput({
          relationType: "unknown_relation",
        }),
      ),
    ).toThrow(/unsupported relationType/);
  });

  it("rejects invalid confidence values", () => {
    for (const confidence of [
      -0.1,
      1.1,
      NaN,
      Infinity,
      -Infinity,
      "0.8",
      null,
    ]) {
      expect(() =>
        createKnowledgeLink(createValidInput({ confidence })),
      ).toThrow(/confidence/);
    }
  });

  it("accepts confidence boundaries", () => {
    for (const confidence of [0, 1]) {
      expect(() =>
        createKnowledgeLink(createValidInput({ confidence })),
      ).not.toThrow();
    }
  });

  it("rejects invalid timestamps", () => {
    for (const createdAt of [
      "",
      "not-a-date",
      "2026-99-99",
      123456,
    ]) {
      expect(() =>
        createKnowledgeLink(createValidInput({ createdAt })),
      ).toThrow(/createdAt/);
    }
  });
});
