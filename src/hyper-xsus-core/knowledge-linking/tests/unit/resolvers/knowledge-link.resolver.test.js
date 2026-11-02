import { describe, it, expect } from "vitest";

import {
  KNOWLEDGE_LINK_RESOLVER_VERSION,
  findKnowledgeLinksBySourceId,
  findKnowledgeLinksByTargetId,
  findKnowledgeLinksByRelationType,
  findKnowledgeLinksBetween,
  findReciprocalKnowledgeLinks,
  findKnowledgeLinksByEntityId,
  resolveKnowledgeLinks,
} from "../../../resolvers/knowledge-link.resolver.js";

function createLink(overrides = {}) {
  return {
    id: "link-1",
    sourceId: "entity-a",
    targetId: "entity-b",
    relationType: "supports",
    confidence: 0.9,
    createdAt: "2026-01-01T00:00:00.000Z",
    metadata: {},
    ...overrides,
  };
}

function createLinks() {
  return [
    createLink({ id: "link-1" }),
    createLink({
      id: "link-2",
      sourceId: "entity-b",
      targetId: "entity-c",
      relationType: "depends_on",
    }),
    createLink({
      id: "link-3",
      sourceId: "entity-a",
      targetId: "entity-c",
      relationType: "supports",
    }),
    createLink({
      id: "link-4",
      sourceId: "entity-b",
      targetId: "entity-a",
      relationType: "related_to",
    }),
  ];
}

describe("KnowledgeLink Resolver", () => {
  it("raporton versionin e resolver-it", () => {
    expect(KNOWLEDGE_LINK_RESOLVER_VERSION).toBe("1.0.0");
  });

  it("kërkon lidhjet sipas sourceId", () => {
    const result = findKnowledgeLinksBySourceId(
      createLinks(),
      "entity-a",
    );

    expect(result.count).toBe(2);
    expect(result.links.map((link) => link.id)).toEqual([
      "link-1",
      "link-3",
    ]);
  });

  it("kërkon lidhjet sipas targetId", () => {
    const result = findKnowledgeLinksByTargetId(
      createLinks(),
      "entity-a",
    );

    expect(result.count).toBe(1);
    expect(result.links[0].id).toBe("link-4");
  });

  it("kërkon lidhjet sipas relationType", () => {
    const result = findKnowledgeLinksByRelationType(
      createLinks(),
      "supports",
    );

    expect(result.count).toBe(2);
    expect(result.links.every(
      (link) => link.relationType === "supports",
    )).toBe(true);
  });

  it("kërkon lidhjet midis dy entiteteve në drejtimin e dhënë", () => {
    const result = findKnowledgeLinksBetween(
      createLinks(),
      "entity-a",
      "entity-b",
    );

    expect(result.count).toBe(1);
    expect(result.links[0].id).toBe("link-1");
  });

  it("nuk i trajton lidhjet e kundërta si të njëjtin drejtim", () => {
    const result = findKnowledgeLinksBetween(
      createLinks(),
      "entity-a",
      "entity-b",
    );

    expect(result.links.some(
      (link) => link.id === "link-4",
    )).toBe(false);
  });

  it("identifikon lidhjet reciproke", () => {
    const result = findReciprocalKnowledgeLinks(createLinks());

    expect(result.count).toBe(2);
    expect(result.links.map((link) => link.id)).toEqual([
      "link-1",
      "link-4",
    ]);
  });

  it("kërkon lidhjet ku entiteti shfaqet në cilëndo anë", () => {
    const result = findKnowledgeLinksByEntityId(
      createLinks(),
      "entity-a",
    );

    expect(result.count).toBe(3);
    expect(result.links.map((link) => link.id)).toEqual([
      "link-1",
      "link-3",
      "link-4",
    ]);
  });

  it("kombinon filtrat me kushtin AND", () => {
    const result = resolveKnowledgeLinks(createLinks(), {
      sourceId: "entity-a",
      relationType: "supports",
    });

    expect(result.count).toBe(2);
    expect(result.links.map((link) => link.id)).toEqual([
      "link-1",
      "link-3",
    ]);
  });

  it("mbështet filtrin entityId së bashku me relationType", () => {
    const result = resolveKnowledgeLinks(createLinks(), {
      entityId: "entity-a",
      relationType: "supports",
    });

    expect(result.count).toBe(2);
    expect(result.links.map((link) => link.id)).toEqual([
      "link-1",
      "link-3",
    ]);
  });

  it("kthen të gjitha lidhjet kur filtrat janë bosh", () => {
    const result = resolveKnowledgeLinks(createLinks());

    expect(result.count).toBe(4);
    expect(result.links).toHaveLength(4);
  });

  it("kthen rezultat bosh kur nuk ka përputhje", () => {
    const result = resolveKnowledgeLinks(createLinks(), {
      sourceId: "missing-entity",
    });

    expect(result.count).toBe(0);
    expect(result.links).toEqual([]);
  });

  it("refuzon listë lidhjesh që nuk është array", () => {
    expect(() =>
      findKnowledgeLinksBySourceId(null, "entity-a"),
    ).toThrow();
  });

  it("refuzon lidhje me strukturë të pavlefshme", () => {
    expect(() =>
      resolveKnowledgeLinks([
        { id: "invalid-link" },
      ]),
    ).toThrow();
  });

  it("refuzon identifikues kërkimi bosh", () => {
    expect(() =>
      findKnowledgeLinksBySourceId(createLinks(), " "),
    ).toThrow();
  });

  it("nuk ndryshon listën hyrëse", () => {
    const links = createLinks();
    const original = structuredClone(links);

    resolveKnowledgeLinks(links, {
      relationType: "supports",
    });

    expect(links).toEqual(original);
  });

  it("kthen rezultat dhe listë lidhjesh të ngrira", () => {
    const result = findKnowledgeLinksBySourceId(
      createLinks(),
      "entity-a",
    );

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.links)).toBe(true);
  });
});
