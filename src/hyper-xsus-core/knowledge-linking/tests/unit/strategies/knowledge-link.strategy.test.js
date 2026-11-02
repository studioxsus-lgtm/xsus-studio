import { describe, it, expect } from "vitest";

import {
  KNOWLEDGE_LINK_STRATEGY_VERSION,
  KNOWLEDGE_LINK_STRATEGY_TYPES,
  createKnowledgeLinkStrategy,
  isKnowledgeLinkStrategy,
  describeKnowledgeLinkStrategy,
} from "../../../strategies/knowledge-link.strategy.js";

describe("KnowledgeLink Strategy", () => {
  it("raporton versionin e strategjisë", () => {
    expect(KNOWLEDGE_LINK_STRATEGY_VERSION).toBe("1.0.0");
  });

  it("ekspozon llojet e mbështetura të strategjive", () => {
    expect(KNOWLEDGE_LINK_STRATEGY_TYPES).toEqual([
      "direct",
      "reverse",
      "bidirectional",
      "relation",
      "entity",
      "combined",
    ]);

    expect(Object.isFrozen(KNOWLEDGE_LINK_STRATEGY_TYPES)).toBe(true);
  });

  it("krijon strategji direct", () => {
    const strategy = createKnowledgeLinkStrategy({
      type: "direct",
      filters: { sourceId: "entity-a" },
    });

    expect(strategy.type).toBe("direct");
    expect(strategy.filters.sourceId).toBe("entity-a");
    expect(strategy.limit).toBeNull();
    expect(strategy.minimumConfidence).toBeNull();
  });

  it("krijon strategji reverse", () => {
    const strategy = createKnowledgeLinkStrategy({
      type: "reverse",
      filters: { targetId: "entity-b" },
    });

    expect(strategy.type).toBe("reverse");
    expect(strategy.filters.targetId).toBe("entity-b");
  });

  it("krijon strategji bidirectional", () => {
    const strategy = createKnowledgeLinkStrategy({
      type: "bidirectional",
      filters: {
        sourceId: "entity-a",
        targetId: "entity-b",
      },
    });

    expect(strategy.type).toBe("bidirectional");
    expect(Object.keys(strategy.filters)).toHaveLength(2);
  });

  it("krijon strategji relation", () => {
    const strategy = createKnowledgeLinkStrategy({
      type: "relation",
      filters: { relationType: "supports" },
    });

    expect(strategy.filters.relationType).toBe("supports");
  });

  it("krijon strategji entity", () => {
    const strategy = createKnowledgeLinkStrategy({
      type: "entity",
      filters: { entityId: "entity-a" },
    });

    expect(strategy.filters.entityId).toBe("entity-a");
  });

  it("krijon strategji combined me të paktën dy filtra", () => {
    const strategy = createKnowledgeLinkStrategy({
      type: "combined",
      filters: {
        sourceId: "entity-a",
        relationType: "supports",
      },
    });

    expect(Object.keys(strategy.filters)).toHaveLength(2);
  });

  it("normalizon hapësirat në vlerat e filtrave", () => {
    const strategy = createKnowledgeLinkStrategy({
      type: "direct",
      filters: { sourceId: " entity-a " },
    });

    expect(strategy.filters.sourceId).toBe("entity-a");
  });

  it("pranon limit pozitiv dhe minimumConfidence të vlefshëm", () => {
    const strategy = createKnowledgeLinkStrategy({
      type: "direct",
      filters: { sourceId: "entity-a" },
      limit: 10,
      minimumConfidence: 0.75,
    });

    expect(strategy.limit).toBe(10);
    expect(strategy.minimumConfidence).toBe(0.75);
  });

  it("refuzon input që nuk është objekt i thjeshtë", () => {
    expect(() => createKnowledgeLinkStrategy(null)).toThrow();
    expect(() => createKnowledgeLinkStrategy([])).toThrow();
    expect(() => createKnowledgeLinkStrategy("direct")).toThrow();
  });

  it("refuzon lloj strategjie të panjohur", () => {
    expect(() =>
      createKnowledgeLinkStrategy({
        type: "unknown",
      }),
    ).toThrow();
  });

  it("refuzon lloj strategjie bosh", () => {
    expect(() =>
      createKnowledgeLinkStrategy({
        type: " ",
      }),
    ).toThrow();
  });

  it("refuzon filtra që nuk janë objekt i thjeshtë", () => {
    expect(() =>
      createKnowledgeLinkStrategy({
        type: "direct",
        filters: null,
      }),
    ).toThrow();
  });

  it("refuzon vlera bosh në filtra", () => {
    expect(() =>
      createKnowledgeLinkStrategy({
        type: "direct",
        filters: { sourceId: " " },
      }),
    ).toThrow();
  });

  it("refuzon strategji direct pa sourceId", () => {
    expect(() =>
      createKnowledgeLinkStrategy({
        type: "direct",
      }),
    ).toThrow();
  });

  it("refuzon strategji reverse pa targetId", () => {
    expect(() =>
      createKnowledgeLinkStrategy({
        type: "reverse",
      }),
    ).toThrow();
  });

  it("refuzon strategji bidirectional pa të dy identifikuesit", () => {
    expect(() =>
      createKnowledgeLinkStrategy({
        type: "bidirectional",
        filters: { sourceId: "entity-a" },
      }),
    ).toThrow();
  });

  it("refuzon strategji relation pa relationType", () => {
    expect(() =>
      createKnowledgeLinkStrategy({
        type: "relation",
      }),
    ).toThrow();
  });

  it("refuzon strategji entity pa entityId", () => {
    expect(() =>
      createKnowledgeLinkStrategy({
        type: "entity",
      }),
    ).toThrow();
  });

  it("refuzon strategji combined me më pak se dy filtra", () => {
    expect(() =>
      createKnowledgeLinkStrategy({
        type: "combined",
        filters: { sourceId: "entity-a" },
      }),
    ).toThrow();
  });

  it("refuzon limit që nuk është numër i plotë pozitiv", () => {
    for (const limit of [0, -1, 1.5, "10", null]) {
      expect(() =>
        createKnowledgeLinkStrategy({
          type: "direct",
          filters: { sourceId: "entity-a" },
          limit,
        }),
      ).toThrow();
    }
  });

  it("refuzon minimumConfidence jashtë intervalit 0–1", () => {
    for (const value of [-0.1, 1.1, NaN, Infinity, "0.5", null]) {
      expect(() =>
        createKnowledgeLinkStrategy({
          type: "direct",
          filters: { sourceId: "entity-a" },
          minimumConfidence: value,
        }),
      ).toThrow();
    }
  });

  it("pranon kufijtë 0 dhe 1 për minimumConfidence", () => {
    for (const value of [0, 1]) {
      const strategy = createKnowledgeLinkStrategy({
        type: "direct",
        filters: { sourceId: "entity-a" },
        minimumConfidence: value,
      });

      expect(strategy.minimumConfidence).toBe(value);
    }
  });

  it("kthen strategji të ngrirë dhe filtra të ngrirë", () => {
    const strategy = createKnowledgeLinkStrategy({
      type: "direct",
      filters: { sourceId: "entity-a" },
    });

    expect(Object.isFrozen(strategy)).toBe(true);
    expect(Object.isFrozen(strategy.filters)).toBe(true);
  });

  it("identifikon strategji të vlefshme", () => {
    const strategy = createKnowledgeLinkStrategy({
      type: "direct",
      filters: { sourceId: "entity-a" },
    });

    expect(isKnowledgeLinkStrategy(strategy)).toBe(true);
  });

  it("refuzon objekt me version të pasaktë", () => {
    const strategy = createKnowledgeLinkStrategy({
      type: "direct",
      filters: { sourceId: "entity-a" },
    });

    expect(
      isKnowledgeLinkStrategy({
        ...strategy,
        version: "2.0.0",
      }),
    ).toBe(false);
  });

  it("refuzon objekt që nuk është strategji", () => {
    expect(isKnowledgeLinkStrategy(null)).toBe(false);
    expect(isKnowledgeLinkStrategy({})).toBe(false);
  });

  it("krijon përshkrimin e strategjisë", () => {
    const strategy = createKnowledgeLinkStrategy({
      type: "combined",
      filters: {
        sourceId: "entity-a",
        relationType: "supports",
      },
      limit: 5,
      minimumConfidence: 0.8,
    });

    const description =
      describeKnowledgeLinkStrategy(strategy);

    expect(description).toEqual({
      version: "1.0.0",
      type: "combined",
      filterFields: ["sourceId", "relationType"],
      hasLimit: true,
      hasMinimumConfidence: true,
    });

    expect(Object.isFrozen(description)).toBe(true);
    expect(Object.isFrozen(description.filterFields)).toBe(true);
  });

  it("refuzon përshkrimin e një strategjie të pavlefshme", () => {
    expect(() =>
      describeKnowledgeLinkStrategy(null),
    ).toThrow();
  });
});
