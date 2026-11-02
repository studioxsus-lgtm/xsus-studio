import { describe, it, expect } from "vitest";

import {
  createKnowledgeLink,
} from "../../../models/knowledge-link.js";

function createValidLink() {
  return createKnowledgeLink({
    id: "link-001",
    sourceId: "knowledge-001",
    targetId: "knowledge-002",
    relationType: "supports",
    confidence: 0.95,
    metadata: {
      domain: "science",
    },
  });
}

describe("KnowledgeLink — Immutability", () => {
  it("freezes the main link object", () => {
    const link = createValidLink();

    expect(Object.isFrozen(link)).toBe(true);
  });

  it("freezes the metadata object", () => {
    const link = createValidLink();

    expect(Object.isFrozen(link.metadata)).toBe(true);
  });

  it("does not allow modification of link properties", () => {
    const link = createValidLink();

    expect(() => {
      link.confidence = 0.2;
    }).toThrow(TypeError);

    expect(link.confidence).toBe(0.95);
  });

  it("does not allow adding new properties", () => {
    const link = createValidLink();

    expect(() => {
      link.status = "modified";
    }).toThrow(TypeError);

    expect(link.status).toBeUndefined();
  });

  it("does not allow metadata modification", () => {
    const link = createValidLink();

    expect(() => {
      link.metadata.domain = "technology";
    }).toThrow(TypeError);

    expect(link.metadata.domain).toBe("science");
  });

  it("does not allow adding metadata properties", () => {
    const link = createValidLink();

    expect(() => {
      link.metadata.status = "verified";
    }).toThrow(TypeError);

    expect(link.metadata.status).toBeUndefined();
  });
});
