import { describe, it, expect } from "vitest";
import { performance } from "node:perf_hooks";

import {
  createKnowledgeLinkEngine,
} from "../engines/knowledge-link.engine.js";

function createLink(id, overrides = {}) {
  const index = Number(id.split("-")[1]);

  return {
    id,
    sourceId: `entity-${index % 100}`,
    targetId: `target-${index % 50}`,
    relationType: index % 3 === 0
      ? "depends_on"
      : "supports",
    confidence: (index % 100) / 100,
    createdAt: "2026-01-01T10:00:00.000Z",
    metadata: {},
    ...overrides,
  };
}

function measure(operation) {
  const start = performance.now();
  const result = operation();
  const duration = performance.now() - start;

  return {
    result,
    durationMs: Number(duration.toFixed(3)),
  };
}

function createDataset(size) {
  return Array.from(
    { length: size },
    (_, index) => createLink(`link-${index}`),
  );
}

describe("KnowledgeLink Engine — Performance Benchmarking", () => {
  it.each([1000, 5000, 10000])(
    "mat performancën e shtimit për %i lidhje",
    (size) => {
      const engine = createKnowledgeLinkEngine();
      const dataset = createDataset(size);

      const measurement = measure(() =>
        engine.addLinks(dataset),
      );

      expect(measurement.result.count).toBe(size);
      expect(engine.getStatus().size).toBe(size);

      console.log(
        `[KnowledgeLink Benchmark] addLinks(${size}): ${measurement.durationMs} ms`,
      );
    },
  );

  it.each([1000, 5000, 10000])(
    "mat performancën e kërkimit sipas relacionit për %i lidhje",
    (size) => {
      const engine = createKnowledgeLinkEngine();

      engine.addLinks(createDataset(size));

      const measurement = measure(() =>
        engine.search({
          relationType: "supports",
        }),
      );

      expect(measurement.result.count).toBeGreaterThan(0);

      expect(
        measurement.result.links.every(
          (link) => link.relationType === "supports",
        ),
      ).toBe(true);

      console.log(
        `[KnowledgeLink Benchmark] search(relationType, ${size}): ${measurement.durationMs} ms`,
      );
    },
  );

  it.each([1000, 5000, 10000])(
    "mat performancën e filtrave të kombinuar për %i lidhje",
    (size) => {
      const engine = createKnowledgeLinkEngine();

      engine.addLinks(createDataset(size));

      const measurement = measure(() =>
        engine.search({
          sourceId: "entity-1",
          relationType: "supports",
        }),
      );

      expect(
        measurement.result.links.every(
          (link) =>
            link.sourceId === "entity-1" &&
            link.relationType === "supports",
        ),
      ).toBe(true);

      console.log(
        `[KnowledgeLink Benchmark] combinedSearch(${size}): ${measurement.durationMs} ms`,
      );
    },
  );

  it.each([1000, 5000, 10000])(
    "mat performancën e searchByStrategy për %i lidhje",
    (size) => {
      const engine = createKnowledgeLinkEngine();

      engine.addLinks(createDataset(size));

      const measurement = measure(() =>
        engine.searchByStrategy({
          type: "direct",
          filters: {
            sourceId: "entity-1",
          },
          minimumConfidence: 0.5,
          limit: 25,
        }),
      );

      expect(measurement.result.count).toBeLessThanOrEqual(25);

      expect(
        measurement.result.links.every(
          (link) =>
            link.sourceId === "entity-1" &&
            link.confidence >= 0.5,
        ),
      ).toBe(true);

      console.log(
        `[KnowledgeLink Benchmark] searchByStrategy(${size}): ${measurement.durationMs} ms`,
      );
    },
  );

  it.each([1000, 5000, 10000])(
    "mat performancën e fshirjes për %i lidhje",
    (size) => {
      const engine = createKnowledgeLinkEngine();

      engine.addLinks(createDataset(size));

      const measurement = measure(() => {
        let removed = 0;

        for (let index = 0; index < size; index += 1) {
          if (engine.removeLink(`link-${index}`)) {
            removed += 1;
          }
        }

        return removed;
      });

      expect(measurement.result).toBe(size);
      expect(engine.getStatus().size).toBe(0);

      console.log(
        `[KnowledgeLink Benchmark] removeLink(${size}): ${measurement.durationMs} ms`,
      );
    },
  );
});
