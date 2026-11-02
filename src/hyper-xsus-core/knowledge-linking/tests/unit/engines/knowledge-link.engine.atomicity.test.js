import { describe, it, expect } from "vitest";

import {
  createKnowledgeLinkEngine,
} from "../../../engines/knowledge-link.engine.js";

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

describe("KnowledgeLink Engine — Atomicity & Transaction Integrity", () => {
  it("shton të gjitha lidhjet kur grupi është i vlefshëm", () => {
    const engine = createKnowledgeLinkEngine();

    const result = engine.addLinks([
      createLink("atomic-a"),
      createLink("atomic-b"),
      createLink("atomic-c"),
    ]);

    expect(result.count).toBe(3);
    expect(engine.getStatus().size).toBe(3);

    expect(engine.getLinkById("atomic-a")).not.toBeNull();
    expect(engine.getLinkById("atomic-b")).not.toBeNull();
    expect(engine.getLinkById("atomic-c")).not.toBeNull();
  });

  it("refuzon grupin kur përmban ID të dyfishta", () => {
    const engine = createKnowledgeLinkEngine();

    expect(() => {
      engine.addLinks([
        createLink("duplicate-a"),
        createLink("duplicate-b"),
        createLink("duplicate-a"),
      ]);
    }).toThrow();

    expect(engine.getStatus().size).toBe(0);
    expect(engine.listLinks().count).toBe(0);
  });

  it("nuk ruan lidhje të pjesshme kur një lidhje e grupit është e pavlefshme", () => {
    const engine = createKnowledgeLinkEngine();

    expect(() => {
      engine.addLinks([
        createLink("valid-before"),
        createLink("invalid-link", {
          relationType: "unknown-relation",
        }),
        createLink("valid-after"),
      ]);
    }).toThrow();

    expect(engine.getStatus().size).toBe(0);
    expect(engine.getLinkById("valid-before")).toBeNull();
    expect(engine.getLinkById("invalid-link")).toBeNull();
    expect(engine.getLinkById("valid-after")).toBeNull();
  });

  it("ruan gjendjen ekzistuese kur grupi i ri dështon", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLink(createLink("existing-link"));

    expect(() => {
      engine.addLinks([
        createLink("new-valid-link"),
        createLink("new-invalid-link", {
          confidence: 2,
        }),
      ]);
    }).toThrow();

    expect(engine.getStatus().size).toBe(1);
    expect(engine.getLinkById("existing-link")).not.toBeNull();
    expect(engine.getLinkById("new-valid-link")).toBeNull();
    expect(engine.getLinkById("new-invalid-link")).toBeNull();
  });

  it("nuk ndryshon gjendjen kur grupi përmban ID që ekziston tashmë", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLink(createLink("existing-id"));

    expect(() => {
      engine.addLinks([
        createLink("new-id"),
        createLink("existing-id"),
      ]);
    }).toThrow();

    expect(engine.getStatus().size).toBe(1);
    expect(engine.getLinkById("existing-id")).not.toBeNull();
    expect(engine.getLinkById("new-id")).toBeNull();
  });

  it("lejon një grup të ri të vlefshëm pas një operacioni të dështuar", () => {
    const engine = createKnowledgeLinkEngine();

    expect(() => {
      engine.addLinks([
        createLink("failed-a"),
        createLink("failed-b", {
          relationType: "invalid",
        }),
      ]);
    }).toThrow();

    const result = engine.addLinks([
      createLink("recovered-a"),
      createLink("recovered-b"),
    ]);

    expect(result.count).toBe(2);
    expect(engine.getStatus().size).toBe(2);
    expect(engine.getLinkById("recovered-a")).not.toBeNull();
    expect(engine.getLinkById("recovered-b")).not.toBeNull();
    expect(engine.getLinkById("failed-a")).toBeNull();
  });

  it("ruan rendin e lidhjeve të shtuara në një grup", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLinks([
      createLink("ordered-a"),
      createLink("ordered-b"),
      createLink("ordered-c"),
    ]);

    const result = engine.listLinks();

    expect(result.links.map((link) => link.id)).toEqual([
      "ordered-a",
      "ordered-b",
      "ordered-c",
    ]);
  });

  it("refuzon grupin pas mbylljes pa ndryshuar gjendjen", () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLink(createLink("before-close"));
    engine.close();

    expect(() => {
      engine.addLinks([
        createLink("after-close-a"),
        createLink("after-close-b"),
      ]);
    }).toThrow();

    expect(engine.getStatus().closed).toBe(true);
    expect(engine.getStatus().size).toBe(0);
  });
});
