import {
  beforeEach,
  describe,
  it,
  expect,
  vi
} from "vitest";

const {
  registerIntegrationMock,
  closeMock
} = vi.hoisted(() => ({
  registerIntegrationMock: vi.fn(),
  closeMock: vi.fn(() => true)
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

describe("XSUS AI — Knowledge Dataset Bootstrap Failure", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    registerIntegrationMock.mockReturnValue({
      success: true,
      close: closeMock
    });
  });

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

    expect(
      registerIntegrationMock
    ).not.toHaveBeenCalled();
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

    expect(
      registerIntegrationMock
    ).not.toHaveBeenCalled();
  });
});
