import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/knowledge/knowledge-dataset-integration.js", () => ({
  registerKnowledgeDatasetIntegration: vi.fn(() => ({
    success: true,
    close: vi.fn(() => true)
  }))
}));

import {
  initializeKnowledgeDatasets
} from "../../src/knowledge/knowledge-dataset-bootstrap.js";

describe("XSUS AI — Knowledge Dataset Bootstrap Failure", () => {
  it("nuk regjistron integrimin nëse rikthimi dështon", async () => {
    const storageAdapter = {
      loadDatasets: vi.fn().mockResolvedValue({
        success: false,
        error: "Gabim i simuluar gjatë rikthimit."
      }),
      saveDatasets: vi.fn().mockResolvedValue({
        success: true
      })
    };

    await expect(
      initializeKnowledgeDatasets({
        storageAdapter
      })
    ).rejects.toThrow(
      "Rikthimi i dataset-eve të XSUS AI dështoi."
    );
  });

  it("përfshin arsyen origjinale në gabimin e rikthimit", async () => {
    const storageAdapter = {
      loadDatasets: vi.fn().mockResolvedValue({
        success: false,
        error: "JSON i dëmtuar."
      }),
      saveDatasets: vi.fn().mockResolvedValue({
        success: true
      })
    };

    await expect(
      initializeKnowledgeDatasets({
        storageAdapter
      })
    ).rejects.toThrow(
      /JSON i dëmtuar/
    );
  });
});
