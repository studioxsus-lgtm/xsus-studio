import { describe, it, expect } from "vitest";

import {
  createKnowledgeLink,
  KNOWLEDGE_LINK_VERSION,
} from "../../../models/knowledge-link.js";

describe("KnowledgeLink — Creation", () => {
  it("exposes the expected model version", () => {
    expect(KNOWLEDGE_LINK_VERSION).toBe("1.0.0");
  });

  it("creates a valid knowledge link", () => {
    const link = createKnowledgeLink({
      id: "link-001",
      sourceId: "knowledge-001",
      targetId: "knowledge-002",
      relationType: "supports",
      confidence: 0.95,
      createdAt: "2026-01-01T10:00:00.000Z",
    });

    expect(link).toMatchObject({
      id: "link-001",
      sourceId: "knowledge-001",
      targetId: "knowledge-002",
      relationType: "supports",
      confidence: 0.95,
      createdAt: "2026-01-01T10:00:00.000Z",
    });
  });

  it("trims whitespace from required string fields", () => {
    const link = createKnowledgeLink({
      id: " link-002 ",
      sourceId: " knowledge-003 ",
      targetId: " knowledge-004 ",
      relationType: " supports ",
    });

    expect(link.id).toBe("link-002");
    expect(link.sourceId).toBe("knowledge-003");
    expect(link.targetId).toBe("knowledge-004");
    expect(link.relationType).toBe("supports");
  });

  it("uses default confidence when omitted", () => {
    const link = createKnowledgeLink({
      id: "link-003",
      sourceId: "knowledge-005",
      targetId: "knowledge-006",
      relationType: "related_to",
    });

    expect(link.confidence).toBe(1);
  });

  it("generates createdAt when omitted", () => {
    const before = Date.now();

    const link = createKnowledgeLink({
      id: "link-004",
      sourceId: "knowledge-007",
      targetId: "knowledge-008",
      relationType: "depends_on",
    });

    const after = Date.now();
    const timestamp = Date.parse(link.createdAt);

    expect(Number.isFinite(timestamp)).toBe(true);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });

  it("creates empty metadata when omitted", () => {
    const link = createKnowledgeLink({
      id: "link-005",
      sourceId: "knowledge-009",
      targetId: "knowledge-010",
      relationType: "contains",
    });

    expect(link.metadata).toEqual({});
  });
});
