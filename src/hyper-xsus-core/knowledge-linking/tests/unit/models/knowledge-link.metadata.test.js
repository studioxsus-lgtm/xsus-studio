import { describe, it, expect } from "vitest";

import {
  createKnowledgeLink,
} from "../../../models/knowledge-link.js";

function createValidInput(overrides = {}) {
  return {
    id: "link-metadata-001",
    sourceId: "knowledge-source",
    targetId: "knowledge-target",
    relationType: "related_to",
    ...overrides,
  };
}

describe("KnowledgeLink — Metadata Tests", () => {
  it("krijon metadata bosh kur metadata nuk specifikohet", () => {
    const link = createKnowledgeLink(
      createValidInput(),
    );

    expect(link.metadata).toEqual({});
    expect(Object.isFrozen(link.metadata)).toBe(true);
  });

  it("krijon kopje të veçantë të metadata-s hyrëse", () => {
    const metadata = {
      domain: "programming",
      language: "javascript",
      priority: 3,
    };

    const link = createKnowledgeLink(
      createValidInput({ metadata }),
    );

    expect(link.metadata).toEqual(metadata);
    expect(link.metadata).not.toBe(metadata);
  });

  it("ruan metadata-n kur objekti burimor ndryshohet më vonë", () => {
    const metadata = {
      domain: "mathematics",
      confidence: 0.95,
    };

    const link = createKnowledgeLink(
      createValidInput({ metadata }),
    );

    metadata.domain = "physics";
    metadata.confidence = 0.25;
    metadata.newProperty = "changed";

    expect(link.metadata).toEqual({
      domain: "mathematics",
      confidence: 0.95,
    });
  });

  it("refuzon metadata null", () => {
    expect(() =>
      createKnowledgeLink(
        createValidInput({ metadata: null }),
      ),
    ).toThrow();
  });

  it("refuzon metadata në formë array", () => {
    expect(() =>
      createKnowledgeLink(
        createValidInput({ metadata: [] }),
      ),
    ).toThrow();
  });

  it("refuzon metadata në formë string", () => {
    expect(() =>
      createKnowledgeLink(
        createValidInput({ metadata: "invalid" }),
      ),
    ).toThrow();
  });

  it("refuzon metadata në formë numerike", () => {
    expect(() =>
      createKnowledgeLink(
        createValidInput({ metadata: 123 }),
      ),
    ).toThrow();
  });
});
