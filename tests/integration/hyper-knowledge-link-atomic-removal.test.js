import { describe, expect, it } from "vitest";
import { createKnowledgeLinkAPI } from "../../src/hyper-xsus-core/knowledge-linking/public/knowledge-link.api.js";

const makeLink = (id, sourceId, targetId) => ({
  id, sourceId, targetId, relationType: "related_to",
  confidence: 0.9, createdAt: "2026-01-01T00:00:00Z", metadata: {}
});

function setup() {
  const api = createKnowledgeLinkAPI();
  api.addMany([
    makeLink("l1", "a", "b"),
    makeLink("l2", "a", "c"),
    makeLink("l3", "d", "b")
  ]);
  return api;
}

describe("Hyper KnowledgeLink — atomic bulk removal", () => {
  it("removes multiple links while keeping search indexes consistent", () => {
    const api = setup();
    const removed = api.removeMany(["l1", "l3"]);
    expect(removed.count).toBe(2);
    expect(removed.links.map(link => link.id)).toEqual(["l1", "l3"]);
    expect(api.getById("l1")).toBeNull();
    expect(api.getById("l2").id).toBe("l2");
    expect(api.find({ sourceId: "a" }).links.map(link => link.id)).toEqual(["l2"]);
    expect(api.verifyIntegrity().valid).toBe(true);
  });
  it("does not remove any links when a requested ID is missing", () => {
    const api = setup();
    expect(() => api.removeMany(["l1", "missing"])).toThrow("not found");
    expect(api.getById("l1")).not.toBeNull();
    expect(api.getStatus().size).toBe(3);
  });
  it("rejects duplicate and malformed IDs without mutation", () => {
    const api = setup();
    expect(() => api.removeMany(["l1", "l1"])).toThrow("Duplicate");
    expect(() => api.removeMany(["l1", " "])).toThrow("non-empty");
    expect(() => api.removeMany([])).toThrow("1 to 1000");
    expect(() => api.removeMany(Array.from({ length: 1001 }, () => "l1"))).toThrow("1 to 1000");
    expect(api.getStatus().size).toBe(3);
  });
  it("rejects removal after close", () => {
    const api = setup();
    api.close();
    expect(() => api.removeMany(["l1"])).toThrow("closed");
  });
});
