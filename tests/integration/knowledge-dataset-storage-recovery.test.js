
import { afterEach, describe, expect, test } from "vitest";
import {
  mkdtemp,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createKnowledgeDatasetPipeline } from "../../src/knowledge/knowledge-dataset-pipeline.js";

const temporaryDirectories = [];

async function createTemporaryFilePath() {
  const directory = await mkdtemp(
    join(tmpdir(), "xsus-knowledge-recovery-")
  );

  temporaryDirectories.push(directory);

  return join(directory, "datasets.json");
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true })
    )
  );
});

describe("XSUS Knowledge Dataset Storage Recovery", () => {
  test("ruan dataset-et në JSON dhe i rikthen pas rinisjes", async () => {
    const filePath = await createTemporaryFilePath();

    const firstPipeline = await createKnowledgeDatasetPipeline({
      filePath
    });

    try {
      const registration = await firstPipeline.registerDataset({
        id: "recovery-test",
        name: "Recovery Test",
        language: "sq",
        entries: [
          {
            question: "Çfarë është XSUS AI?",
            answer: "Një sistem inteligjence artificiale."
          }
        ]
      });

      expect(registration.success).toBe(true);

      const savedContent = await readFile(filePath, "utf8");
      const savedJSON = JSON.parse(savedContent);

      expect(savedJSON).toBeDefined();
      expect(savedJSON).toHaveProperty("datasets");
      expect(savedJSON.datasets).toHaveLength(1);
      expect(savedJSON.datasets[0].id).toBe("recovery-test");
    } finally {
      await firstPipeline.close();
    }

    const secondPipeline = await createKnowledgeDatasetPipeline({
      filePath
    });

    try {
      const result = secondPipeline.listDatasets();

      expect(result.success).toBe(true);
      expect(result.datasets).toHaveLength(1);
      expect(result.datasets[0].id).toBe("recovery-test");
      expect(result.datasets[0].name).toBe("Recovery Test");
    } finally {
      await secondPipeline.close();
    }
  });

  test("skedari JSON i dëmtuar nuk duhet të rikthehet si dataset i vlefshëm", async () => {
    const filePath = await createTemporaryFilePath();

    await writeFile(filePath, "{ JSON i dëmtuar", "utf8");

    await expect(
      createKnowledgeDatasetPipeline({ filePath })
    ).rejects.toThrow();
  });

  test("skedari JSON i ruajtur përmban të dhënat e dataset-it", async () => {
    const filePath = await createTemporaryFilePath();

    const pipeline = await createKnowledgeDatasetPipeline({
      filePath
    });

    try {
      const registration = await pipeline.registerDataset({
        id: "json-content-test",
        name: "JSON Content Test",
        language: "en",
        entries: [
          {
            question: "What is a dataset?",
            answer: "A structured collection of knowledge."
          }
        ]
      });

      expect(registration.success).toBe(true);

      const content = JSON.parse(await readFile(filePath, "utf8"));

      expect(content.datasets[0]).toMatchObject({
        id: "json-content-test",
        name: "JSON Content Test",
        language: "en"
      });

      expect(content.datasets[0].entries).toHaveLength(1);
      expect(content.datasets[0].entries[0]).toMatchObject({
        question: "What is a dataset?",
        answer: "A structured collection of knowledge."
      });
    } finally {
      await pipeline.close();
    }
  });
});
