
import { afterEach, describe, expect, test } from "vitest";
import {
  mkdtemp,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createKnowledgeDatasetPipeline
} from "../../src/knowledge/knowledge-dataset-pipeline.js";

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
  test("ruan dataset-in në JSON dhe e rikthen pas rinisjes", async () => {
    const filePath = await createTemporaryFilePath();

    const firstPipeline = await createKnowledgeDatasetPipeline({
      filePath
    });

    try {
      const registration = await firstPipeline.registerDataset(
        "recovery-test",
        [
          {
            question: "Çfarë është XSUS AI?",
            answer: "Një sistem inteligjence artificiale."
          }
        ]
      );

      expect(registration.success).toBe(true);

      const savedContent = await readFile(filePath, "utf8");
      const savedJSON = JSON.parse(savedContent);

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
    } finally {
      await secondPipeline.close();
    }
  });

  test("refuzon rikthimin nga një skedar JSON i dëmtuar", async () => {
    const filePath = await createTemporaryFilePath();

    await writeFile(filePath, "{ JSON i dëmtuar", "utf8");

    await expect(
      createKnowledgeDatasetPipeline({ filePath })
    ).rejects.toThrow();
  });

  test("ruan hyrjet dhe fushat e dataset-it në JSON", async () => {
    const filePath = await createTemporaryFilePath();

    const pipeline = await createKnowledgeDatasetPipeline({
      filePath
    });

    try {
      const registration = await pipeline.registerDataset(
        "json-content-test",
        [
          {
            question: "What is a dataset?",
            answer: "A structured collection of knowledge."
          }
        ]
      );

      expect(registration.success).toBe(true);

      const content = JSON.parse(
        await readFile(filePath, "utf8")
      );

      expect(content.datasets).toHaveLength(1);

      expect(content.datasets[0].id).toBe(
        "json-content-test"
      );

      expect(content.datasets[0].collection).toHaveLength(1);

      expect(content.datasets[0].collection[0]).toMatchObject({
        question: "What is a dataset?",
        answer: "A structured collection of knowledge."
      });
    } finally {
      await pipeline.close();
    }
  });
});
