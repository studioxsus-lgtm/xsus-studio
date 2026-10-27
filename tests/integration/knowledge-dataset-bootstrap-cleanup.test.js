import {
  beforeEach,
  describe,
  it,
  expect,
  vi
} from "vitest";

const {
  closeMock,
  registerIntegrationMock
} = vi.hoisted(() => ({
  closeMock: vi.fn(() => true),
  registerIntegrationMock: vi.fn()
}));

vi.mock(
  "../../src/knowledge/knowledge-dataset-integration.js",
  () => ({
    registerKnowledgeDatasetIntegration:
      registerIntegrationMock
  })
);

import {
  initializeKnowledgeDatasets
} from "../../src/knowledge/knowledge-dataset-bootstrap.js";

describe("XSUS AI — Knowledge Dataset Bootstrap Cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    closeMock.mockReturnValue(true);

    registerIntegrationMock.mockReturnValue({
      success: false,
      error: "Regjistrimi i integrimit dështoi.",
      close: closeMock
    });
  });

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

    expect(
      registerIntegrationMock
    ).toHaveBeenCalledTimes(1);

    expect(
      closeMock
    ).toHaveBeenCalledTimes(1);
  });
});
