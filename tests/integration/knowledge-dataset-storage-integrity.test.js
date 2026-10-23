
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

function createTestEntries(prefix = "xsus-entry") {
  return [
    {
      id: `${prefix}-1`,
      title: "XSUS AI",
      content: "Një sistem inteligjence artificiale.",
      language: "sq"
    }
  ];
}

function expectSuccessfulRegistration(registration) {
  if (registration?.success !== true) {
    console.error(
      "XSUS DATASET REGISTRATION ERROR:",
      JSON.stringify(registration, null, 2)
    );
  }

  expect(registration?.success).toBe(true);
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
        createTestEntries()
      );

      expectSuccessfulRegistration(registration);

      const savedJSON = JSON.parse(
        await readFile(filePath, "utf8")
      );

      expect(savedJSON.formatVersion).toBe("1.0.0");
      expect(savedJSON.datasets).toHaveLength(1);
      expect(savedJSON.datasets[0].id).toBe("recovery-test");
      expect(savedJSON.datasets[0].entries).toHaveLength(1);

      expect(savedJSON.datasets[0].entries[0]).toMatchObject({
        id: "xsus-entry-1",
        title: "XSUS AI",
        content: "Një sistem inteligjence artificiale."
      });
    } finally {
      await firstPipeline.close();
    }

    const secondPipeline = await createKnowledgeDatasetPipeline({
      filePath
    });

    try {
      const datasets = secondPipeline.listDatasets();

      expect(Array.isArray(datasets)).toBe(true);
      expect(datasets).toHaveLength(1);
      expect(datasets[0].id).toBe("recovery-test");
      expect(datasets[0].entryCount).toBe(1);

      const restored = secondPipeline.getDataset("recovery-test");

      expect(restored).not.toBeNull();
      expect(restored.collection).toHaveLength(1);
      expect(restored.collection[0]).toMatchObject({
        id: "xsus-entry-1",
        title: "XSUS AI",
        content: "Një sistem inteligjence artificiale."
      });
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
            id: "entry-en-1",
            title: "Knowledge Dataset",
            content: "A structured collection of knowledge.",
            language: "en",
            domain: "general",
            topic: "datasets",
            keywords: ["knowledge", "dataset"],
            tags: ["test"]
          }
        ]
      );

      expectSuccessfulRegistration(registration);

      const content = JSON.parse(
        await readFile(filePath, "utf8")
      );

      expect(content.datasets).toHaveLength(1);
      expect(content.datasets[0].id).toBe("json-content-test");
      expect(content.datasets[0].entries).toHaveLength(1);

      expect(content.datasets[0].entries[0]).toMatchObject({
        id: "entry-en-1",
        title: "Knowledge Dataset",
        content: "A structured collection of knowledge.",
        language: "en",
        domain: "general",
        topic: "datasets",
        keywords: ["knowledge", "dataset"],
        tags: ["test"]
      });
    } finally {
      await pipeline.close();
    }
  });

  test("rikthen disa dataset-e me përmbajtjen e saktë pas rinisjes", async () => {
    const filePath = await createTemporaryFilePath();

    const firstPipeline = await createKnowledgeDatasetPipeline({
      filePath
    });

    try {
      const albanianRegistration =
        await firstPipeline.registerDataset(
          "recovery-albanian",
          createTestEntries("sq-entry")
        );

      expectSuccessfulRegistration(albanianRegistration);

      const englishRegistration =
        await firstPipeline.registerDataset(
          "recovery-english",
          [
            {
              id: "en-entry-1",
              title: "Knowledge Engine",
              content: "A structured knowledge engine.",
              language: "en",
              domain: "general",
              topic: "knowledge",
              keywords: ["engine", "knowledge"],
              tags: ["recovery"]
            }
          ]
        );

      expectSuccessfulRegistration(englishRegistration);

      const savedJSON = JSON.parse(
        await readFile(filePath, "utf8")
      );

      expect(savedJSON.datasets).toHaveLength(2);

      const savedIds = savedJSON.datasets
        .map((dataset) => dataset.id)
        .sort();

      expect(savedIds).toEqual([
        "recovery-albanian",
        "recovery-english"
      ]);
    } finally {
      await firstPipeline.close();
    }

    const restoredPipeline = await createKnowledgeDatasetPipeline({
      filePath
    });

    try {
      const datasets = restoredPipeline.listDatasets();

      expect(datasets).toHaveLength(2);

      const albanianDataset = restoredPipeline.getDataset(
        "recovery-albanian"
      );

      const englishDataset = restoredPipeline.getDataset(
        "recovery-english"
      );

      expect(albanianDataset).not.toBeNull();
      expect(englishDataset).not.toBeNull();

      expect(albanianDataset.collection).toHaveLength(1);
      expect(albanianDataset.collection[0]).toMatchObject({
        id: "sq-entry-1",
        title: "XSUS AI",
        language: "sq"
      });

      expect(englishDataset.collection).toHaveLength(1);
      expect(englishDataset.collection[0]).toMatchObject({
        id: "en-entry-1",
        title: "Knowledge Engine",
        content: "A structured knowledge engine.",
        language: "en",
        keywords: ["engine", "knowledge"],
        tags: ["recovery"]
      });

      expect(
        restoredPipeline.getDataset("dataset-that-does-not-exist")
      ).toBeNull();
    } finally {
      await restoredPipeline.close();
    }
  });
});
