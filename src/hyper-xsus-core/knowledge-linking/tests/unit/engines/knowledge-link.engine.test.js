import { describe, it, expect } from "vitest";

import {
  createKnowledgeLinkEngine,
  KNOWLEDGE_LINK_ENGINE_VERSION,
} from "../../engines/knowledge-link.engine.js";

function createLink(id, overrides = {}) {
  return {
    id,
    sourceId: "entity-a",
    targetId: "entity-b",
    relationType: "supports",
    confidence: 0.9,
    createdAt: "2026-01-01T10:00:00.000Z",
    metadata: {},
    ...overrides,
  };
}

describe("KnowledgeLink Engine", () => {
  it("raporton versionin e engine-it", () => {
    expect(KNOWLEDGE_LINK_ENGINE_VERSION).toBe("1.1.0");
  });

  it("krijon engine me status fillestar", () => {
    const engine = createKnowledgeLinkEngine();

    expect(engine.getStatus()).toEqual({
      version: "1.1.0",
      policyVersion: "1.0.0",
      closed: false,
      size: 0,
    });
  });

  it("krijon një KnowledgeLink", () => {
    const engine = createKnowledgeLinkEngine();

    const link = engine.addLink(
      createLink("link-1"),
    );

    expect(link.id).toBe("link-1");
    expect(link.sourceId).toBe("entity-a");
    expect(link.targetId).toBe("entity-b");
    expect(engine.getStatus().size).toBe(1);
  });

  it("ruan KnowledgeLink me metadata", () => {
    const engine = createKnowledgeLinkEngine();

    const link = engine.addLink(
      createLink("link-metadata", {
        metadata: {
          domain: "mathematics",
          origin: "test",
        },
      }),
    );

    expect(link.metadata).toEqual({
      domain: "mathematics",
      origin: "test",
    });
  });

  it("pranon lidhje me confidence në kufijtë e lejuar", () => {
    const engine = createKnowledgeLinkEngine();

    const low = engine.addLink(
      createLink("link-low", {
        confidence: 0,
      }),
    );

    const high = engine.addLink(
      createLink("link-high", {
        confidence: 1,
      }),
    );

    expect(low.confidence).toBe(0);
    expect(high.confidence).toBe(1);
    expect(engine.getStatus().size).toBe(2);
  });

  it("refuzon KnowledgeLink të pavlefshëm", () => {
    const engine = createKnowledgeLinkEngine();

    expect(() =>
      engine.addLink(
        createLink("invalid-link", {
          confidence: 2,
        }),
      ),
    ).toThrow();

    expect(engine.getStatus().size).toBe(0);
  });

  it("raporton kodin e gabimit për validim të dështuar", () => {
    const engine = createKnowledgeLinkEngine();

    try {
      engine.addLink(
        createLink("invalid-validation", {
          confidence: -1,
        }),
      );

      throw new Error("Expected validation error.");
    } catch (error) {
      expect(error.code).toBe(
        "KNOWLEDGE_LINK_ENGINE_VALIDATION_FAILED",
      );
    }
  });

  it("refuzon ID të përsëritur", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLink(createLink("duplicate-link"));

    expect(() =>
      engine.addLink(createLink("duplicate-link")),
    ).toThrow(
      "KnowledgeLink already exists: duplicate-link.",
    );

    expect(engine.getStatus().size).toBe(1);
  });

  it("raporton kodin e gabimit për ID të përsëritur", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLink(createLink("duplicate-code"));

    try {
      engine.addLink(createLink("duplicate-code"));

      throw new Error("Expected duplicate error.");
    } catch (error) {
      expect(error.code).toBe(
        "KNOWLEDGE_LINK_ENGINE_DUPLICATE_ID",
      );
    }
  });

  it("shton disa KnowledgeLink në mënyrë atomike", () => {
    const engine = createKnowledgeLinkEngine();

    const result = engine.addLinks([
      createLink("batch-1"),
      createLink("batch-2", {
        sourceId: "entity-c",
        targetId: "entity-d",
      }),
    ]);

    expect(result.count).toBe(2);
    expect(result.links).toHaveLength(2);
    expect(engine.getStatus().size).toBe(2);
  });

  it("nuk ruan asnjë lidhje kur një element i grupit është i pavlefshëm", () => {
    const engine = createKnowledgeLinkEngine();

    expect(() =>
      engine.addLinks([
        createLink("atomic-1"),
        createLink("atomic-2", {
          confidence: 5,
        }),
      ]),
    ).toThrow();

    expect(engine.getStatus().size).toBe(0);
  });

  it("refuzon ID të përsëritura brenda grupit", () => {
    const engine = createKnowledgeLinkEngine();

    expect(() =>
      engine.addLinks([
        createLink("same-id"),
        createLink("same-id"),
      ]),
    ).toThrow();

    expect(engine.getStatus().size).toBe(0);
  });

  it("raporton kodin e gabimit për ID të përsëritur në grup", () => {
    const engine = createKnowledgeLinkEngine();

    try {
      engine.addLinks([
        createLink("batch-duplicate"),
        createLink("batch-duplicate"),
      ]);

      throw new Error("Expected batch duplicate error.");
    } catch (error) {
      expect(error.code).toBe(
        "KNOWLEDGE_LINK_ENGINE_DUPLICATE_BATCH_ID",
      );
    }
  });

  it("refuzon hyrje që nuk janë array në addLinks", () => {
    const engine = createKnowledgeLinkEngine();

    expect(() => engine.addLinks({})).toThrow(
      "inputs must be an array.",
    );

    expect(engine.getStatus().size).toBe(0);
  });

  it("kthen KnowledgeLink sipas ID-së", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLink(createLink("find-link"));

    expect(
      engine.getLinkById("find-link").id,
    ).toBe("find-link");
  });

  it("kthen null kur ID-ja nuk ekziston", () => {
    const engine = createKnowledgeLinkEngine();

    expect(
      engine.getLinkById("missing-link"),
    ).toBeNull();
  });

  it("kthen listën e të gjitha lidhjeve", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLinks([
      createLink("list-1"),
      createLink("list-2"),
      createLink("list-3"),
    ]);

    const result = engine.listLinks();

    expect(result.count).toBe(3);
    expect(result.links).toHaveLength(3);
  });

  it("kërkon lidhje sipas sourceId", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLinks([
      createLink("source-1", {
        sourceId: "entity-a",
      }),
      createLink("source-2", {
        sourceId: "entity-b",
      }),
    ]);

    const result = engine.search({
      sourceId: "entity-a",
    });

    expect(result.count).toBe(1);
    expect(result.links[0].id).toBe("source-1");
  });

  it("kërkon lidhje sipas targetId", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLinks([
      createLink("target-1", {
        targetId: "entity-x",
      }),
      createLink("target-2", {
        targetId: "entity-y",
      }),
    ]);

    const result = engine.search({
      targetId: "entity-x",
    });

    expect(result.count).toBe(1);
    expect(result.links[0].id).toBe("target-1");
  });

  it("kërkon lidhje sipas relationType", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLinks([
      createLink("relation-1", {
        relationType: "supports",
      }),
      createLink("relation-2", {
        relationType: "depends_on",
      }),
    ]);

    const result = engine.search({
      relationType: "depends_on",
    });

    expect(result.count).toBe(1);
    expect(result.links[0].id).toBe("relation-2");
  });

  it("përdor strategjinë e kërkimit", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLinks([
      createLink("strategy-1", {
        sourceId: "entity-a",
      }),
      createLink("strategy-2", {
        sourceId: "entity-b",
      }),
    ]);

    const result = engine.searchByStrategy({
      type: "direct",
      filters: {
        sourceId: "entity-a",
      },
    });

    expect(result.count).toBe(1);
    expect(result.links[0].id).toBe("strategy-1");
  });

  it("filtron rezultatet sipas minimumConfidence", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLinks([
      createLink("confidence-1", {
        confidence: 0.4,
      }),
      createLink("confidence-2", {
        confidence: 0.8,
      }),
    ]);

    const result = engine.searchByStrategy({
      type: "combined",
      filters: {},
      minimumConfidence: 0.7,
    });

    expect(result.count).toBe(1);
    expect(result.links[0].id).toBe("confidence-2");
  });

  it("kufizon rezultatet sipas limit", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLinks([
      createLink("limit-1"),
      createLink("limit-2"),
      createLink("limit-3"),
    ]);

    const result = engine.searchByStrategy({
      type: "combined",
      filters: {},
      limit: 2,
    });

    expect(result.count).toBe(2);
    expect(result.links).toHaveLength(2);
  });

  it("fshin një KnowledgeLink", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLink(createLink("remove-link"));

    expect(engine.removeLink("remove-link")).toBe(true);
    expect(engine.getStatus().size).toBe(0);
  });

  it("kthen false kur lidhja për fshirje nuk ekziston", () => {
    const engine = createKnowledgeLinkEngine();

    expect(engine.removeLink("missing-link")).toBe(false);
  });

  it("pastron të gjitha lidhjet", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLinks([
      createLink("clear-1"),
      createLink("clear-2"),
    ]);

    const result = engine.clear();

    expect(result.removedCount).toBe(2);
    expect(engine.getStatus().size).toBe(0);
  });

  it("mbyll engine dhe pastron memorien", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLink(createLink("close-link"));

    const result = engine.close();

    expect(result).toEqual({
      success: true,
      closed: true,
      alreadyClosed: false,
    });

    expect(engine.getStatus()).toEqual({
      version: "1.1.0",
      policyVersion: "1.0.0",
      closed: true,
      size: 0,
    });
  });

  it("lejon thirrje të përsëritura për close", () => {
    const engine = createKnowledgeLinkEngine();

    const first = engine.close();
    const second = engine.close();

    expect(first.alreadyClosed).toBe(false);
    expect(second.alreadyClosed).toBe(true);
  });

  it("refuzon operacionet pas mbylljes së engine-it", () => {
    const engine = createKnowledgeLinkEngine();

    engine.close();

    expect(() =>
      engine.addLink(createLink("after-close")),
    ).toThrow("KnowledgeLink Engine is closed.");

    expect(() => engine.listLinks()).toThrow(
      "KnowledgeLink Engine is closed.",
    );

    expect(() =>
      engine.search({ sourceId: "entity-a" }),
    ).toThrow("KnowledgeLink Engine is closed.");
  });

  it("kthen rezultate të pandryshueshme", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLink(createLink("immutable-result"));

    const result = engine.listLinks();

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.links)).toBe(true);
  });

  // --------------------------------------------------
  // KNOWLEDGELINK POLICY INTEGRATION
  // --------------------------------------------------

  it("lejon lidhje normale me politikën parazgjedhur", () => {
    const engine = createKnowledgeLinkEngine();

    const link = engine.addLink(
      createLink("policy-default"),
    );

    expect(link.id).toBe("policy-default");
    expect(engine.getStatus().size).toBe(1);
  });

  it("raporton versionin e policy në status", () => {
    const engine = createKnowledgeLinkEngine();

    expect(engine.getStatus().policyVersion).toBe(
      "1.0.0",
    );
  });

  it("refuzon relationType që nuk lejohet nga policy", () => {
    const engine = createKnowledgeLinkEngine({
      policy: {
        allowedRelationTypes: ["supports"],
      },
    });

    expect(() =>
      engine.addLink(
        createLink("policy-relation-denied", {
          relationType: "depends_on",
        }),
      ),
    ).toThrow(
      "KnowledgeLink was rejected by policy.",
    );

    expect(engine.getStatus().size).toBe(0);
  });

  it("raporton kodin e gabimit kur policy refuzon lidhjen", () => {
    const engine = createKnowledgeLinkEngine({
      policy: {
        allowedRelationTypes: ["supports"],
      },
    });

    try {
      engine.addLink(
        createLink("policy-error-code", {
          relationType: "causes",
        }),
      );

      throw new Error("Expected policy rejection.");
    } catch (error) {
      expect(error.code).toBe(
        "KNOWLEDGE_LINK_ENGINE_POLICY_REJECTED",
      );
    }
  });

  it("përfshin arsyet e refuzimit nga policy", () => {
    const engine = createKnowledgeLinkEngine({
      policy: {
        allowedRelationTypes: ["supports"],
      },
    });

    try {
      engine.addLink(
        createLink("policy-reasons", {
          relationType: "contradicts",
        }),
      );

      throw new Error("Expected policy rejection.");
    } catch (error) {
      expect(error.code).toBe(
        "KNOWLEDGE_LINK_ENGINE_POLICY_REJECTED",
      );

      expect(error.details).toBeInstanceOf(Array);
      expect(error.details.length).toBeGreaterThan(0);
    }
  });

  it("refuzon confidence më të ulët se minimumConfidence i policy", () => {
    const engine = createKnowledgeLinkEngine({
      policy: {
        minimumConfidence: 0.8,
      },
    });

    expect(() =>
      engine.addLink(
        createLink("policy-confidence-denied", {
          confidence: 0.5,
        }),
      ),
    ).toThrow(
      "KnowledgeLink was rejected by policy.",
    );

    expect(engine.getStatus().size).toBe(0);
  });

  it("lejon confidence që plotëson minimumConfidence të policy", () => {
    const engine = createKnowledgeLinkEngine({
      policy: {
        minimumConfidence: 0.8,
      },
    });

    const link = engine.addLink(
      createLink("policy-confidence-allowed", {
        confidence: 0.9,
      }),
    );

    expect(link.confidence).toBe(0.9);
    expect(engine.getStatus().size).toBe(1);
  });

  it("lejon vetëm relationType të konfiguruara në policy", () => {
    const engine = createKnowledgeLinkEngine({
      policy: {
        allowedRelationTypes: [
          "supports",
          "depends_on",
        ],
      },
    });

    const first = engine.addLink(
      createLink("policy-allowed-1", {
        relationType: "supports",
      }),
    );

    const second = engine.addLink(
      createLink("policy-allowed-2", {
        relationType: "depends_on",
      }),
    );

    expect(first.relationType).toBe("supports");
    expect(second.relationType).toBe("depends_on");
    expect(engine.getStatus().size).toBe(2);
  });

  it("ruan integritetin atomik të addLinks kur policy refuzon një lidhje", () => {
    const engine = createKnowledgeLinkEngine({
      policy: {
        allowedRelationTypes: ["supports"],
      },
    });

    expect(() =>
      engine.addLinks([
        createLink("policy-atomic-1", {
          relationType: "supports",
        }),
        createLink("policy-atomic-2", {
          relationType: "contradicts",
        }),
      ]),
    ).toThrow(
      "KnowledgeLink was rejected by policy.",
    );

    expect(engine.getStatus().size).toBe(0);
    expect(
      engine.getLinkById("policy-atomic-1"),
    ).toBeNull();
    expect(
      engine.getLinkById("policy-atomic-2"),
    ).toBeNull();
  });

  it("nuk ndryshon lidhjet ekzistuese kur një grup refuzohet nga policy", () => {
    const engine = createKnowledgeLinkEngine({
      policy: {
        allowedRelationTypes: ["supports"],
      },
    });

    engine.addLink(
      createLink("policy-existing"),
    );

    expect(() =>
      engine.addLinks([
        createLink("policy-new-1"),
        createLink("policy-new-2", {
          relationType: "causes",
        }),
      ]),
    ).toThrow(
      "KnowledgeLink was rejected by policy.",
    );

    expect(engine.getStatus().size).toBe(1);
    expect(
      engine.getLinkById("policy-existing"),
    ).not.toBeNull();
    expect(
      engine.getLinkById("policy-new-1"),
    ).toBeNull();
  });
});
