
import { afterEach, describe, expect, it } from "vitest";

import {
  createKnowledgeDatasetPipeline
} from "../../src/knowledge/knowledge-dataset-pipeline.js";

describe("XSUS AI — Knowledge Dataset Pipeline Failure Recovery", () => {
  let pipeline;
  let controlledStorage;

  afterEach(async () => {
    if (pipeline) {
      await pipeline.close();
      pipeline = undefined;
    }

    controlledStorage = undefined;
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createControlledStorage() {
    let savedDatasets = [];
    let failuresRemaining = 0;

    const storageAdapter = {
      async loadDatasets() {
        return {
          success: true,
          datasets: clone(savedDatasets),
          recovered: false
        };
      },

      async saveDatasets(datasets) {
        if (failuresRemaining > 0) {
          failuresRemaining -= 1;

          return {
            success: false,
            error: "Gabim i simuluar gjatë ruajtjes së dataset-eve."
          };
        }

        savedDatasets = clone(datasets);

        return {
          success: true,
          datasetCount: savedDatasets.length
        };
      }
    };

    return {
      storageAdapter,

      failNextSaves(count = 1) {
        failuresRemaining = count;
      },

      getSavedDatasets() {
        return clone(savedDatasets);
      }
    };
  }

  async function createPipeline() {
    controlledStorage = createControlledStorage();

    pipeline = await createKnowledgeDatasetPipeline({
      filePath: "/tmp/xsus-knowledge-pipeline-failure-test.json",
      storageAdapter: controlledStorage.storageAdapter
    });

    return pipeline;
  }

  function createEntry(overrides = {}) {
    return {
      id: "failure-recovery-entry",
      title: "Failure Recovery Fixture",
      content:
        "This entry verifies recovery after dataset persistence failures.",
      domain: "programming",
      topic: "failure recovery",
      language: "en",
      difficulty: "beginner",
      status: "verified",
      keywords: ["failure", "recovery", "persistence"],
      tags: ["xsus", "integration"],
      source: "pipeline-failure-test",
      version: "1.0.0",
      ...overrides
    };
  }

  it("rikthen regjistrin kur ruajtja e regjistrimit dështon", async () => {
    await createPipeline();

    controlledStorage.failNextSaves(1);

    const result = await pipeline.registerDataset(
      "failure-registration-dataset",
      [createEntry()]
    );

    expect(result.success).toBe(false);
    expect(result.rollbackSucceeded).toBe(true);

    expect(
      pipeline.getDataset("failure-registration-dataset")
    ).toBeNull();

    expect(pipeline.listDatasets()).toHaveLength(0);

    expect(
      pipeline.getMetadata().persistenceConsistent
    ).toBe(true);

    expect(controlledStorage.getSavedDatasets()).toHaveLength(0);
  });

  it("shënon persistencën jokonsistente kur dështon edhe rollback-u", async () => {
    await createPipeline();

    controlledStorage.failNextSaves(2);

    const result = await pipeline.registerDataset(
      "double-failure-dataset",
      [createEntry()]
    );

    expect(result.success).toBe(false);
    expect(result.rollbackSucceeded).toBe(false);

    expect(
      pipeline.getDataset("double-failure-dataset")
    ).toBeNull();

    expect(
      pipeline.getMetadata().persistenceConsistent
    ).toBe(false);

    expect(
      pipeline.getMetadata().lastPersistenceError
    ).toBeTruthy();

    expect(controlledStorage.getSavedDatasets()).toHaveLength(0);
  });

  it("rikuperon konsistencën pas një ruajtjeje të mëvonshme të suksesshme", async () => {
    await createPipeline();

    controlledStorage.failNextSaves(2);

    const failedRegistration = await pipeline.registerDataset(
      "recovery-after-failure-dataset",
      [createEntry()]
    );

    expect(failedRegistration.success).toBe(false);
    expect(
      pipeline.getMetadata().persistenceConsistent
    ).toBe(false);

    const saveResult = await pipeline.save();

    expect(saveResult.success).toBe(true);
    expect(
      pipeline.getMetadata().persistenceConsistent
    ).toBe(true);
    expect(
      pipeline.getMetadata().lastPersistenceError
    ).toBeNull();
  });

  it("rikthen dataset-in në memorie kur ruajtja e heqjes dështon", async () => {
    await createPipeline();

    const registration = await pipeline.registerDataset(
      "failure-removal-dataset",
      [
        createEntry({
          id: "failure-removal-entry"
        })
      ]
    );

    expect(registration.success).toBe(true);

    controlledStorage.failNextSaves(1);

    const removal = await pipeline.removeDataset(
      "failure-removal-dataset"
    );

    expect(removal.success).toBe(false);
    expect(removal.removed).toBe(false);
    expect(removal.rollbackSucceeded).toBe(true);

    const restoredDataset = pipeline.getDataset(
      "failure-removal-dataset"
    );

    expect(restoredDataset).not.toBeNull();
    expect(restoredDataset.entryCount).toBe(1);

    expect(
      pipeline.getMetadata().persistenceConsistent
    ).toBe(true);

    expect(
      controlledStorage.getSavedDatasets()
    ).toHaveLength(1);
  });

  it("ruan metadata të sakta pas dështimit të ruajtjes", async () => {
    await createPipeline();

    controlledStorage.failNextSaves(1);

    const result = await pipeline.save();

    expect(result.success).toBe(false);
    expect(result.error).toContain("ruajtjes");

    const metadata = pipeline.getMetadata();

    expect(metadata.engine).toBe(
      "xsus-knowledge-dataset-pipeline"
    );
    expect(metadata.version).toBe("1.3.0");
    expect(metadata.persistenceConsistent).toBe(false);
    expect(metadata.lastPersistenceError).toBeTruthy();
    expect(metadata.closed).toBe(false);
  });
});
