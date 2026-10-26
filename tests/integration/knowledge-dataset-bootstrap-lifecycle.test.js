import { describe, it, expect, vi } from "vitest";

import {
  initializeKnowledgeDatasets
} from "../../src/knowledge/knowledge-dataset-bootstrap.js";

describe("XSUS AI — Knowledge Dataset Bootstrap Lifecycle", () => {
  it("refuzon inicializimin pa filePath ose storageAdapter", async () => {
    await expect(
      initializeKnowledgeDatasets()
    ).rejects.toThrow(
      "filePath duhet të jetë një shteg i vlefshëm për ruajtjen e dataset-eve."
    );
  });

  it("refuzon një storageAdapter të pavlefshëm", async () => {
    await expect(
      initializeKnowledgeDatasets({
        storageAdapter: {}
      })
    ).rejects.toThrow(
      "storageAdapter duhet të ofrojë metodat saveDatasets dhe loadDatasets."
    );
  });

  it("mbyll integrimin vetëm një herë", async () => {
    const storageAdapter = {
      loadDatasets: vi.fn().mockResolvedValue({
        success: true,
        datasets: []
      }),
      saveDatasets: vi.fn().mockResolvedValue({
        success: true
      })
    };

    const instance = await initializeKnowledgeDatasets({
      storageAdapter
    });

    expect(instance.success).toBe(true);

    expect(instance.close()).toBe(true);
    expect(instance.close()).toBe(false);

    await expect(
      instance.save()
    ).rejects.toThrow(
      "Inicializuesi i dataset-eve është mbyllur."
    );
  });

  it("ekspozon metadata të sakta për adapter-in", async () => {
    const storageAdapter = {
      loadDatasets: vi.fn().mockResolvedValue({
        success: true,
        datasets: []
      }),
      saveDatasets: vi.fn().mockResolvedValue({
        success: true
      })
    };

    const instance = await initializeKnowledgeDatasets({
      storageAdapter
    });

    expect(instance.getMetadata()).toEqual({
      engine: "xsus-knowledge-dataset-bootstrap",
      version: "1.1.0",
      storageMode: "adapter"
    });

    instance.close();
  });
});
