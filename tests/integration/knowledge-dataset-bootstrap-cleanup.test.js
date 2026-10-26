import { describe, it, expect, vi } from "vitest";

const closeMock = vi.fn(() => true);

vi.mock("../../src/knowledge/knowledge-dataset-integration.js", () => ({
  registerKnowledgeDatasetIntegration: vi.fn(() => ({
    success: false,
    error: "Regjistrimi i integrimit dështoi.",
    close: closeMock
  }))
}));

import {
  initializeKnowledgeDatasets
} from "../../src/knowledge/knowledge-dataset-bootstrap.js";

describe("XSUS AI — Knowledge Dataset Bootstrap Cleanup", () => {
  it("pastron integrimin kur regjistrimi dështon", async () => {
    const storageAdapter = {
      loadDatasets: vi.fn().mockResolvedValue({
        success: true,
        datasets: []
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
      "Regjistrimi i integrimit dështoi."
    );

    expect(closeMock).toHaveBeenCalledTimes(1);
  });
});
