import { describe, it, expect } from "vitest";

import {
  KNOWLEDGE_LINK_INTERFACE_VERSION,
  KNOWLEDGE_LINK_REQUIRED_FIELDS,
  KNOWLEDGE_LINK_INTERFACE_METHODS,
  conformsToKnowledgeLinkInterface,
  getKnowledgeLinkInterfaceContract,
} from "../../interfaces/knowledge-link.interface.js";

function createValidKnowledgeLink() {
  return {
    id: "link-001",
    sourceId: "source-001",
    targetId: "target-001",
    relationType: "related_to",
    confidence: 0.95,
    createdAt: "2026-11-02T08:00:00.000Z",
    metadata: {},
  };
}

describe("KnowledgeLink Interface Contract", () => {
  it("ekspozon versionin e kontratës", () => {
    expect(KNOWLEDGE_LINK_INTERFACE_VERSION).toBe("1.0.0");
  });

  it("përcakton të gjitha fushat e detyrueshme", () => {
    expect(KNOWLEDGE_LINK_REQUIRED_FIELDS).toEqual([
      "id",
      "sourceId",
      "targetId",
      "relationType",
      "confidence",
      "createdAt",
      "metadata",
    ]);
  });

  it("përcakton metodat standarde", () => {
    expect(KNOWLEDGE_LINK_INTERFACE_METHODS).toEqual([
      "create",
      "validate",
      "resolve",
      "serialize",
    ]);
  });

  it("pranon një KnowledgeLink me të gjitha fushat", () => {
    expect(
      conformsToKnowledgeLinkInterface(
        createValidKnowledgeLink(),
      ),
    ).toBe(true);
  });

  it("refuzon objektin kur mungon një fushë e detyrueshme", () => {
    const link = createValidKnowledgeLink();
    delete link.confidence;

    expect(
      conformsToKnowledgeLinkInterface(link),
    ).toBe(false);
  });

  it("refuzon null", () => {
    expect(
      conformsToKnowledgeLinkInterface(null),
    ).toBe(false);
  });

  it("refuzon array", () => {
    expect(
      conformsToKnowledgeLinkInterface([]),
    ).toBe(false);
  });

  it("refuzon vlerat primitive", () => {
    expect(
      conformsToKnowledgeLinkInterface("invalid"),
    ).toBe(false);

    expect(
      conformsToKnowledgeLinkInterface(123),
    ).toBe(false);
  });

  it("kthen kontratën e pandryshueshme", () => {
    const contract = getKnowledgeLinkInterfaceContract();

    expect(contract.name).toBe("KnowledgeLink");
    expect(contract.version).toBe("1.0.0");
    expect(Object.isFrozen(contract)).toBe(true);
    expect(Object.isFrozen(contract.requiredFields)).toBe(true);
    expect(Object.isFrozen(contract.methods)).toBe(true);
  });
});
