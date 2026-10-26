import { describe, it, expect, vi } from "vitest";

import {
  initializeKnowledgeDatasets
} from "../../src/knowledge/knowledge-dataset-bootstrap.js";

import {
  createKnowledgeEntry
} from "../../src/knowledge/knowledge-entry.js";

describe("XSUS AI — Knowledge Dataset Bootstrap Restart", () => {
  it("ruan dhe rikthen një dataset real pas inicializimit të ri", async () => {
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

    const entry = createKnowledgeEntry({
      id: "photosynthesis-basics",
      title: "Fotosinteza",
      content:
        "Fotosinteza është procesi përmes të cilit bimët përdorin energjinë e dritës për të prodhuar lëndë ushqyese.",
      domain: "science",
      topic: "biology",
      language: "sq",
      difficulty: "beginner",
      status: "verified",
      keywords: ["fotosinteza", "bimët", "drita"],
      tags: ["biologji", "shkencë"],
      source: "xsus-test-dataset",
      version: "1.0.0"
    });

    // 1. Inicializo instancën e parë.
    const firstInstance = await initializeKnowledgeDatasets({
      storageAdapter
    });

    expect(firstInstance.success).toBe(true);

    // 2. Regjistro dataset-in me njohurinë reale.
    const registration = firstInstance.registry.registerDataset(
      "xsus-science-test",
      [entry],
      {
        datasetVersion: "2.1.0"
      }
    );

    expect(registration.success).toBe(true);

    // 3. Ruaj dataset-in.
    const saveResult = await firstInstance.save();

    expect(saveResult.success).toBe(true);
    expect(storageAdapter.saveDatasets).toHaveBeenCalledTimes(1);
    expect(persistedDatasets).toHaveLength(1);

    firstInstance.close();

    // 4. Inicializo një instancë të re me të njëjtin storage.
    const secondInstance = await initializeKnowledgeDatasets({
      storageAdapter
    });

    expect(secondInstance.success).toBe(true);
    expect(secondInstance.restoration.success).toBe(true);

    // 5. Verifiko dataset-in e rikthyer.
    expect(secondInstance.restoration.datasetCount).toBe(1);
    expect(secondInstance.restoration.datasetIds).toContain(
      "xsus-science-test"
    );

    const restoredDataset =
      secondInstance.registry.getDataset("xsus-science-test");

    expect(restoredDataset).not.toBeNull();

    expect(restoredDataset).toMatchObject({
      id: "xsus-science-test",
      datasetVersion: "2.1.0",
      entryCount: 1
    });

    // 6. Verifiko integritetin e përmbajtjes.
    expect(restoredDataset.collection).toHaveLength(1);

    expect(restoredDataset.collection[0]).toMatchObject({
      id: "photosynthesis-basics",
      title: "Fotosinteza",
      content:
        "Fotosinteza është procesi përmes të cilit bimët përdorin energjinë e dritës për të prodhuar lëndë ushqyese.",
      domain: "science",
      language: "sq",
      status: "verified"
    });

    // 7. Verifiko që njohuria mund të gjendet pas rikthimit.
    const searchResult = secondInstance.registry.search(
      "fotosinteza",
      {
        language: "sq",
        domain: "science"
      }
    );

    expect(searchResult.success).toBe(true);
    expect(searchResult.metadata.resultCount).toBe(1);

    expect(searchResult.results[0]).toMatchObject({
      id: "photosynthesis-basics",
      title: "Fotosinteza",
      datasetId: "xsus-science-test"
    });

    // 8. Verifiko listimin e dataset-eve.
    expect(secondInstance.registry.listDatasets()).toEqual([
      expect.objectContaining({
        id: "xsus-science-test",
        entryCount: 1
      })
    ]);

    secondInstance.close();
  });
});
