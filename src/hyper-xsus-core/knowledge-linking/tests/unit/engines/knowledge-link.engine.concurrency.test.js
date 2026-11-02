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

describe("KnowledgeLink Engine — Concurrency & Race Condition Integrity", () => {
  it("lejon shtime të njëkohshme me ID të ndryshme", async () => {
    const engine = createKnowledgeLinkEngine();

    const results = await Promise.all([
      Promise.resolve().then(() =>
        engine.addLink(createLink("concurrent-a")),
      ),
      Promise.resolve().then(() =>
        engine.addLink(createLink("concurrent-b")),
      ),
      Promise.resolve().then(() =>
        engine.addLink(createLink("concurrent-c")),
      ),
    ]);

    expect(results).toHaveLength(3);
    expect(engine.getStatus().size).toBe(3);

    expect(engine.getLinkById("concurrent-a")).not.toBeNull();
    expect(engine.getLinkById("concurrent-b")).not.toBeNull();
    expect(engine.getLinkById("concurrent-c")).not.toBeNull();
  });

  it("lejon vetëm një shtim kur operacionet konkurrojnë për të njëjtin ID", async () => {
    const engine = createKnowledgeLinkEngine();

    const results = await Promise.allSettled([
      Promise.resolve().then(() =>
        engine.addLink(
          createLink("shared-id", {
            confidence: 0.8,
          }),
        ),
      ),
      Promise.resolve().then(() =>
        engine.addLink(
          createLink("shared-id", {
            confidence: 0.95,
          }),
        ),
      ),
    ]);

    const fulfilled = results.filter(
      (result) => result.status === "fulfilled",
    );

    const rejected = results.filter(
      (result) => result.status === "rejected",
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(engine.getStatus().size).toBe(1);

    expect(engine.getLinkById("shared-id")).not.toBeNull();
  });

  it("ruan integritetin e dy grupeve të vlefshme të shtuara njëkohësisht", async () => {
    const engine = createKnowledgeLinkEngine();

    const results = await Promise.all([
      Promise.resolve().then(() =>
        engine.addLinks([
          createLink("batch-a1"),
          createLink("batch-a2"),
        ]),
      ),
      Promise.resolve().then(() =>
        engine.addLinks([
          createLink("batch-b1"),
          createLink("batch-b2"),
        ]),
      ),
    ]);

    expect(results).toHaveLength(2);
    expect(engine.getStatus().size).toBe(4);

    expect(
      engine.listLinks().links.map((link) => link.id),
    ).toEqual([
      "batch-a1",
      "batch-a2",
      "batch-b1",
      "batch-b2",
    ]);
  });

  it("ruan gjendjen kur dy grupe konkurrojnë për të njëjtin ID", async () => {
    const engine = createKnowledgeLinkEngine();

    const results = await Promise.allSettled([
      Promise.resolve().then(() =>
        engine.addLinks([
          createLink("group-a1"),
          createLink("shared-batch-id"),
        ]),
      ),
      Promise.resolve().then(() =>
        engine.addLinks([
          createLink("group-b1"),
          createLink("shared-batch-id"),
        ]),
      ),
    ]);

    const fulfilled = results.filter(
      (result) => result.status === "fulfilled",
    );

    const rejected = results.filter(
      (result) => result.status === "rejected",
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    expect(engine.getStatus().size).toBe(2);
    expect(
      engine.getLinkById("shared-batch-id"),
    ).not.toBeNull();

    const ids = engine.listLinks().links.map(
      (link) => link.id,
    );

    const groupAExists = ids.includes("group-a1");
    const groupBExists = ids.includes("group-b1");

    expect(groupAExists).not.toBe(groupBExists);

    expect(
      ids.filter((id) =>
        ["group-a1", "group-b1"].includes(id),
      ),
    ).toHaveLength(1);
  });

  it("ruan integritetin gjatë kërkimit dhe shtimit të ndërthurur", async () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLink(createLink("initial-link"));

    const results = await Promise.all([
      Promise.resolve().then(() =>
        engine.search({
          sourceId: "entity-a",
          targetId: "entity-b",
        }),
      ),
      Promise.resolve().then(() =>
        engine.addLink(createLink("added-link")),
      ),
    ]);

    expect(results[0].count).toBe(1);
    expect(engine.getStatus().size).toBe(2);

    const finalResult = engine.search({
      sourceId: "entity-a",
      targetId: "entity-b",
    });

    expect(finalResult.count).toBe(2);
  });

  it("ruan rendin e operacioneve të shtimit dhe pastrimit", async () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLink(createLink("before-clear"));

    const results = await Promise.all([
      Promise.resolve().then(() => engine.clear()),
      Promise.resolve().then(() =>
        engine.addLink(createLink("after-clear")),
      ),
    ]);

    expect(results[0].removedCount).toBe(1);
    expect(engine.getStatus().size).toBe(1);

    expect(
      engine.getLinkById("before-clear"),
    ).toBeNull();

    expect(
      engine.getLinkById("after-clear"),
    ).not.toBeNull();
  });

  it("refuzon shtimet e ndërthurura pas mbylljes së engine-it", async () => {
    const engine = createKnowledgeLinkEngine();

    engine.addLink(createLink("before-close"));

    const results = await Promise.allSettled([
      Promise.resolve().then(() => engine.close()),
      Promise.resolve().then(() =>
        engine.addLink(createLink("after-close")),
      ),
    ]);

    expect(results[0].status).toBe("fulfilled");
    expect(results[1].status).toBe("rejected");

    expect(engine.getStatus().closed).toBe(true);
    expect(engine.getStatus().size).toBe(0);

    expect(() => {
      engine.getLinkById("after-close");
    }).toThrow("KnowledgeLink Engine is closed.");
  });
});
