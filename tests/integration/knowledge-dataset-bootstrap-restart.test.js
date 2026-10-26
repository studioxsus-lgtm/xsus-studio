import { describe, it, expect, vi } from "vitest";

import {
  initializeKnowledgeDatasets
} from "../../src/knowledge/knowledge-dataset-bootstrap.js";

describe("XSUS AI — Knowledge Dataset Bootstrap Restart", () => {
  it("rikthen dataset-et në një inicializues të ri", async () => {
    let persistedDatasets = [];

    const storageAdapter = {
      loadDatasets: vi.fn(async () => ({
        success: true,
        datasets: structuredClone(persistedDatasets)
      })),

      saveDatasets: vi.fn(async (datasets) => {
        persistedDatasets = structuredClone(datasets);

        return {
          success: true
        };
      })
    };

    const firstInstance = await initializeKnowledgeDatasets({
      storageAdapter
    });

    expect(firstInstance.success).toBe(true);

    const saveResult = await firstInstance.save();

    expect(saveResult.success).toBe(true);

    firstInstance.close();

    const secondInstance = await initializeKnowledgeDatasets({
      storageAdapter
    });

    expect(secondInstance.success).toBe(true);
    expect(secondInstance.restoration.success).toBe(true);
    expect(secondInstance.restoration.datasetCount).toBe(0);
    expect(secondInstance.registry.listDatasets()).toEqual([]);

    secondInstance.close();
  });
});
