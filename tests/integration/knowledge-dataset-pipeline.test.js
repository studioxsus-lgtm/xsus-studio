
import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createKnowledgeDatasetPipeline
} from "../../src/knowledge/knowledge-dataset-pipeline.js";

describe("XSUS AI — Knowledge Dataset Pipeline", () => {
  let pipeline;
  let temporaryDirectory;

  afterEach(async () => {
    if (pipeline) {
      pipeline.close();
      pipeline = undefined;
    }

    if (temporaryDirectory) {
      await rm(temporaryDirectory, {
        recursive: true,
        force: true
      });

      temporaryDirectory = undefined;
    }
  });

  async function createPipeline() {
    temporaryDirectory = await mkdtemp(
      join(tmpdir(), "xsus-knowledge-pipeline-")
    );

    const filePath = join(
      temporaryDirectory,
      "knowledge-datasets.json"
    );

    pipeline = await createKnowledgeDatasetPipeline({
      filePath
    });

    return filePath;
  }

  function createEntry() {
    return {
      id: "pipeline-orion-entry",
      title: "Orion Pipeline Integration",
      content:
        "Orion pipeline fixture explains custom XSUS dataset persistence.",
      domain: "programming",
      topic: "pipeline integration",
      language: "en",
      difficulty: "beginner",
      status: "verified",
      keywords: ["orion", "pipeline", "persistence"],
      tags: ["xsus", "integration"],
      source: "pipeline-test",
      version: "1.0.0"
    };
  }

  it("regjistron, kërkon dhe liston një dataset", async () => {
    await createPipeline();

    const registration = await pipeline.registerDataset(
      "pipeline-orion-dataset",
      [createEntry()]
    );

    expect(registration.success).toBe(true);

    const searchResult = pipeline.search("orion pipeline", {
      language: "en",
      domain: "programming"
    });

    expect(searchResult.success).toBe(true);

    expect(
      searchResult.results.some(
        (entry) => entry.id === "pipeline-orion-entry"
      )
    ).toBe(true);

    expect(
      pipeline.listDatasets().some(
        (dataset) => dataset.id === "pipeline-orion-dataset"
      )
    ).toBe(true);
  });

  it("ruan dhe rikthen dataset-in pas krijimit të pipeline-it të ri", async () => {
    const filePath = await createPipeline();

    const registration = await pipeline.registerDataset(
      "pipeline-recovery-dataset",
      [createEntry()]
    );

    expect(registration.success).toBe(true);

    expect(pipeline.close()).toBe(true);
    expect(pipeline.close()).toBe(false);
    pipeline = undefined;

    const restoredPipeline =
      await createKnowledgeDatasetPipeline({ filePath });

    pipeline = restoredPipeline;

    const restoredDataset = pipeline.getDataset(
      "pipeline-recovery-dataset"
    );

    expect(restoredDataset).not.toBeNull();
    expect(restoredDataset.entryCount).toBe(1);

    const searchResult = pipeline.search("orion pipeline", {
      language: "en",
      domain: "programming"
    });

    expect(
      searchResult.results.some(
        (entry) => entry.id === "pipeline-orion-entry"
      )
    ).toBe(true);
  });

  it("refuzon dataset me hyrje të pavlefshme", async () => {
    await createPipeline();

    const result = await pipeline.registerDataset(
      "invalid-pipeline-dataset",
      [
        {
          id: "",
          title: "",
          content: ""
        }
      ]
    );

    expect(result.success).toBe(false);
    expect(pipeline.listDatasets()).toHaveLength(0);
  });

  it("heq dataset-in dhe e ruan heqjen", async () => {
    const filePath = await createPipeline();

    const registration = await pipeline.registerDataset(
      "pipeline-removal-dataset",
      [createEntry()]
    );

    expect(registration.success).toBe(true);

    const removal = await pipeline.removeDataset(
      "pipeline-removal-dataset"
    );

    expect(removal.success).toBe(true);
    expect(removal.removed).toBe(true);
    expect(
      pipeline.getDataset("pipeline-removal-dataset")
    ).toBeNull();

    pipeline.close();
    pipeline = undefined;

    pipeline = await createKnowledgeDatasetPipeline({
      filePath
    });

    expect(
      pipeline.getDataset("pipeline-removal-dataset")
    ).toBeNull();
  });

  it("kthen metadata të pipeline-it", async () => {
    await createPipeline();

    const metadata = pipeline.getMetadata();

    expect(metadata.engine).toBe(
      "xsus-knowledge-dataset-pipeline"
    );

    expect(metadata.version).toBe("1.0.0");
    expect(metadata.storageEnabled).toBe(true);
    expect(metadata.persistenceEnabled).toBe(true);
    expect(metadata.datasetCount).toBe(0);
  });
});
