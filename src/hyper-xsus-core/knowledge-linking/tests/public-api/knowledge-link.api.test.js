
import { describe, it, expect } from "vitest";

import {
  KNOWLEDGE_LINK_API_VERSION,
  createKnowledgeLinkAPI,
} from "../../public/knowledge-link.api.js";

describe("KnowledgeLink Public API", () => {
  function createAPI() {
    return createKnowledgeLinkAPI();
  }

  function createLink(overrides = {}) {
    return {
      id: "link-1",
      sourceId: "entity-1",
      targetId: "entity-2",
      relationType: "related_to",
      confidence: 0.95,
      createdAt: "2026-01-01T10:00:00.000Z",
      metadata: {},
      ...overrides,
    };
  }

  it("ekspozon versionin publik", () => {
    expect(KNOWLEDGE_LINK_API_VERSION).toBe("1.0.0");
  });

  it("krijon një instancë API", () => {
    const api = createAPI();

    expect(api.version).toBe("1.0.0");
    expect(Object.isFrozen(api)).toBe(true);

    api.close();
  });

  it("refuzon konfigurim jo-valid", () => {
    expect(() => createKnowledgeLinkAPI(null))
      .toThrow(TypeError);

    expect(() => createKnowledgeLinkAPI([]))
      .toThrow(TypeError);
  });

  it("regjistron një lidhje", () => {
    const api = createAPI();
    const link = createLink();

    const result = api.add(link);

    expect(result).toBeDefined();

    api.close();
  });

  it("create delegon te Engine", () => {
    const api = createAPI();

    const result = api.create(createLink());

    expect(result).toBeDefined();

    api.close();
  });

  it("regjistron disa lidhje", () => {
    const api = createAPI();

    const result = api.addMany([
      createLink({
        id: "link-1",
      }),
      createLink({
        id: "link-2",
        sourceId: "entity-3",
        targetId: "entity-4",
      }),
    ]);

    expect(result).toBeDefined();

    api.close();
  });

  it("refuzon addMany me input jo-array", () => {
    const api = createAPI();

    expect(() => api.addMany({}))
      .toThrow(TypeError);

    api.close();
  });

  it("kërkon lidhje sipas ID-së", () => {
    const api = createAPI();

    api.add(createLink());

    const result = api.getById("link-1");

    expect(result).toBeDefined();

    api.close();
  });

  it("kërkon lidhje sipas filtrave", () => {
    const api = createAPI();

    api.add(createLink());

    const result = api.find({
      sourceId: "entity-1",
    });

    expect(result).toBeDefined();

    api.close();
  });

  it("refuzon filtrat jo-validë", () => {
    const api = createAPI();

    expect(() => api.find(null))
      .toThrow(TypeError);

    api.close();
  });

  it("kërkon lidhje sipas strategjisë", () => {
    const api = createAPI();

    api.add(createLink());

    const result = api.findByStrategy({
      type: "direct",
      filters: {
        sourceId: "entity-1",
      },
    });

    expect(result).toBeDefined();

    api.close();
  });

  it("kërkon lidhjet e një entiteti", () => {
    const api = createAPI();

    api.add(createLink());

    const result = api.findByEntity("entity-1");

    expect(result).toBeDefined();

    api.close();
  });

  it("refuzon entityId bosh", () => {
    const api = createAPI();

    expect(() => api.findByEntity(" "))
      .toThrow(TypeError);

    api.close();
  });

  it("heq një lidhje", () => {
    const api = createAPI();

    api.add(createLink());

    const result = api.remove("link-1");

    expect(result).toBeDefined();

    api.close();
  });

  it("ofron statusin e Engine", () => {
    const api = createAPI();

    const result = api.getStatus();

    expect(result).toBeDefined();

    api.close();
  });

  it("ofron kontrollin e integritetit", () => {
    const api = createAPI();

    expect(api.verifyIntegrity()).toBeDefined();

    api.close();
  });

  it("lejon mbylljen e përsëritur", () => {
    const api = createAPI();

    expect(() => api.close()).not.toThrow();
    expect(() => api.close()).not.toThrow();
  });

  it("refuzon operacionet pas mbylljes", () => {
    const api = createAPI();

    api.close();

    expect(() => api.add(createLink()))
      .toThrow("KnowledgeLink API is closed.");

    expect(() => api.find({}))
      .toThrow("KnowledgeLink API is closed.");

    expect(() => api.remove("link-1"))
      .toThrow("KnowledgeLink API is closed.");
  });

  it("lejon marrjen e statusit pas mbylljes", () => {
    const api = createAPI();

    api.close();

    expect(() => api.getStatus()).not.toThrow();
  });
});
