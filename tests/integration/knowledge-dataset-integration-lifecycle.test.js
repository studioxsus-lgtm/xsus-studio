
import {
  afterEach,
  describe,
  expect,
  test
} from "vitest";

import {
  hasKnowledgeSource,
  searchKnowledge
} from "../../src/knowledge/knowledge-service.js";

import {
  registerKnowledgeDatasetIntegration
} from "../../src/knowledge/knowledge-dataset-integration.js";

const SOURCE_NAME = "xsus-lifecycle-test-source";

const registeredIntegrations = [];

function createRegistry() {
  const datasets = [
    {
      id: "lifecycle-sq",
      entries: [
        {
          id: "lifecycle-entry-001",
          title: "XSUS lifecycle test",
          content:
            "xsus lifecycle unique integration verification",
          language: "sq",
          domain: "general",
          status: "verified"
        }
      ]
    }
  ];

  return {
    listDatasets() {
      return datasets.map(({ id }) => ({ id }));
    },

    getDataset(id) {
      return datasets.find(dataset => dataset.id === id);
    }
  };
}

afterEach(() => {
  for (const integration of registeredIntegrations.splice(0)) {
    integration.close();
  }
});

describe("XSUS Knowledge Dataset Integration Lifecycle", () => {
  test("regjistron burimin dhe e bën të disponueshëm në Knowledge Service", async () => {
    const integration = registerKnowledgeDatasetIntegration({
      registry: createRegistry(),
      sourceName: SOURCE_NAME
    });

    registeredIntegrations.push(integration);

    expect(integration.success).toBe(true);
    expect(integration.source).toBe(SOURCE_NAME);
    expect(hasKnowledgeSource(SOURCE_NAME)).toBe(true);

    const result = await searchKnowledge(
      "xsus lifecycle unique integration verification",
      {
        language: "sq",
        domain: "general"
      }
    );

    expect(result.success).toBe(true);
    expect(
      result.results.some(
        entry => entry.source === SOURCE_NAME
      )
    ).toBe(true);
  });

  test("refuzon emrin e burimit që është regjistruar tashmë", () => {
    const first = registerKnowledgeDatasetIntegration({
      registry: createRegistry(),
      sourceName: SOURCE_NAME
    });

    registeredIntegrations.push(first);

    const second = registerKnowledgeDatasetIntegration({
      registry: createRegistry(),
      sourceName: SOURCE_NAME
    });

    expect(first.success).toBe(true);
    expect(second.success).toBe(false);
    expect(second.source).toBe(SOURCE_NAME);
    expect(hasKnowledgeSource(SOURCE_NAME)).toBe(true);
  });

  test("close dhe unregister çregjistrojnë burimin vetëm një herë", () => {
    const integration = registerKnowledgeDatasetIntegration({
      registry: createRegistry(),
      sourceName: SOURCE_NAME
    });

    registeredIntegrations.push(integration);

    expect(integration.close()).toBe(true);
    expect(hasKnowledgeSource(SOURCE_NAME)).toBe(false);

    expect(integration.unregister()).toBe(false);
    expect(integration.close()).toBe(false);
  });

  test("lejon regjistrimin përsëri pas çregjistrimit", () => {
    const first = registerKnowledgeDatasetIntegration({
      registry: createRegistry(),
      sourceName: SOURCE_NAME
    });

    registeredIntegrations.push(first);

    expect(first.close()).toBe(true);

    const second = registerKnowledgeDatasetIntegration({
      registry: createRegistry(),
      sourceName: SOURCE_NAME
    });

    registeredIntegrations.push(second);

    expect(second.success).toBe(true);
    expect(hasKnowledgeSource(SOURCE_NAME)).toBe(true);
  });

  test("çregjistrimi nuk heq një burim tjetër", () => {
    const otherSource = `${SOURCE_NAME}-other`;

    const first = registerKnowledgeDatasetIntegration({
      registry: createRegistry(),
      sourceName: SOURCE_NAME
    });

    const second = registerKnowledgeDatasetIntegration({
      registry: createRegistry(),
      sourceName: otherSource
    });

    registeredIntegrations.push(first, second);

    expect(first.close()).toBe(true);
    expect(hasKnowledgeSource(SOURCE_NAME)).toBe(false);
    expect(hasKnowledgeSource(otherSource)).toBe(true);
  });
});
