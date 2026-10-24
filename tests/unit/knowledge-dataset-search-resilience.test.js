import { describe, expect, test } from "vitest";

import {
  createKnowledgeDatasetSearchAdapter
} from "../../src/knowledge/knowledge-dataset-search-adapter.js";

function createRegistry({
  summaries = [],
  datasets = {},
  listError = false,
  getError = []
} = {}) {
  return {
    listDatasets() {
      if (listError) {
        throw new Error("Registry list failure");
      }

      return summaries;
    },

    getDataset(id) {
      if (getError.includes(id)) {
        throw new Error("Dataset read failure");
      }

      return datasets[id] ?? null;
    }
  };
}

function createEntry(overrides = {}) {
  return {
    id: "resilience-entry",
    title: "XSUS AI Resilience",
    content: "Testing reliable knowledge search.",
    domain: "programming",
    topic: "XSUS AI",
    language: "en",
    difficulty: "beginner",
    status: "verified",
    keywords: ["XSUS", "resilience"],
    tags: ["testing"],
    ...overrides
  };
}

describe("Knowledge Dataset Search — Resilience", () => {
  test("kthen gabim kur listDatasets hedh përjashtim", () => {
    const adapter = createKnowledgeDatasetSearchAdapter({
      registry: createRegistry({ listError: true })
    });

    const result = adapter.search("XSUS");

    expect(result.success).toBe(false);
    expect(result.results).toEqual([]);
    expect(result.error).toBeTruthy();
    expect(result.metadata.resultCount).toBe(0);
  });

  test("kthen gabim kur registry kthen listë të pavlefshme", () => {
    const adapter = createKnowledgeDatasetSearchAdapter({
      registry: createRegistry({ summaries: null })
    });

    const result = adapter.search("XSUS");

    expect(result.success).toBe(false);
    expect(result.results).toEqual([]);
    expect(result.error).toBeTruthy();
  });

  test("vazhdon kërkimin kur një dataset nuk mund të lexohet", () => {
    const adapter = createKnowledgeDatasetSearchAdapter({
      registry: createRegistry({
        summaries: [
          { id: "broken" },
          { id: "working" }
        ],
        datasets: {
          working: {
            collection: [createEntry()]
          }
        },
        getError: ["broken"]
      })
    });

    const result = adapter.search("XSUS");

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].id).toBe("resilience-entry");
  });

  test("anashkalon hyrjet e pavlefshme në dataset", () => {
    const adapter = createKnowledgeDatasetSearchAdapter({
      registry: createRegistry({
        summaries: [{ id: "mixed" }],
        datasets: {
          mixed: {
            collection: [
              null,
              "invalid",
              { id: "missing-title", content: "XSUS" },
              createEntry()
            ]
          }
        }
      })
    });

    const result = adapter.search("XSUS");

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].id).toBe("resilience-entry");
  });

  test("kthen rezultate bosh kur dataset-i mungon", () => {
    const adapter = createKnowledgeDatasetSearchAdapter({
      registry: createRegistry({
        summaries: [{ id: "missing" }],
        datasets: {}
      })
    });

    const result = adapter.search("XSUS");

    expect(result.success).toBe(true);
    expect(result.results).toEqual([]);
    expect(result.metadata.resultCount).toBe(0);
  });

  test("anashkalon përmbledhjet e dataset-eve me ID të pavlefshme", () => {
    const adapter = createKnowledgeDatasetSearchAdapter({
      registry: createRegistry({
        summaries: [
          null,
          {},
          { id: "" },
          { id: "valid" }
        ],
        datasets: {
          valid: {
            collection: [createEntry()]
          }
        }
      })
    });

    const result = adapter.search("XSUS");

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].id).toBe("resilience-entry");
  });

  test("kthen gabim për opsione jo-objekt", () => {
    const adapter = createKnowledgeDatasetSearchAdapter({
      registry: createRegistry({
        summaries: [{ id: "valid" }],
        datasets: {
          valid: {
            collection: [createEntry()]
          }
        }
      })
    });

    const result = adapter.search("XSUS", null);

    expect(result.success).toBe(false);
    expect(result.results).toEqual([]);
    expect(result.error).toBeTruthy();
  });
});
