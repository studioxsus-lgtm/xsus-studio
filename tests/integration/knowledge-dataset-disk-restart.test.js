import { describe, it, expect } from "vitest";

import {
  mkdtemp,
  readFile,
  rm
} from "node:fs/promises";

import {
  tmpdir
} from "node:os";

import {
  join
} from "node:path";

import {
  initializeKnowledgeDatasets
} from "../../src/knowledge/knowledge-dataset-bootstrap.js";

import {
  createKnowledgeEntry
} from "../../src/knowledge/knowledge-entry.js";

describe("XSUS AI — Knowledge Dataset Disk Restart", () => {
  it("ruan dhe rikthen dataset-in nga një skedar real JSON", async () => {
    const temporaryDirectory = await mkdtemp(
      join(tmpdir(), "xsus-ai-dataset-")
    );

    const filePath = join(
      temporaryDirectory,
      "knowledge-datasets.json"
    );

    let firstInstance;
    let secondInstance;

    try {
      const entry = createKnowledgeEntry({
        id: "photosynthesis-disk-test",
        title: "Fotosinteza",
        content:
          "Fotosinteza u mundëson bimëve të përdorin energjinë e dritës për të prodhuar lëndë ushqyese.",
        domain: "science",
        topic: "biology",
        language: "sq",
        difficulty: "beginner",
        status: "verified",
        keywords: ["fotosinteza", "bimët", "drita"],
        tags: ["biologji", "shkencë"],
        source: "xsus-disk-restart-test",
        version: "1.0.0"
      });

      // 1. Inicializo sistemin me storage real në disk.
      firstInstance = await initializeKnowledgeDatasets({
        filePath
      });

      expect(firstInstance.success).toBe(true);
      expect(firstInstance.getMetadata().storageMode).toBe("file");

      // 2. Regjistro dataset-in.
      const registration = firstInstance.registry.registerDataset(
        "xsus-science-disk-test",
        [entry],
        {
          datasetVersion: "2.1.0"
        }
      );

      expect(registration.success).toBe(true);

      // 3. Ruaj dataset-in në skedarin JSON.
      const saveResult = await firstInstance.save();

      expect(saveResult.success).toBe(true);
      expect(saveResult.datasetCount).toBe(1);

      // 4. Kontrollo përmbajtjen reale të skedarit.
      const fileContents = await readFile(filePath, "utf8");
      const snapshot = JSON.parse(fileContents);

      expect(snapshot.formatVersion).toBe("1.0.0");
      expect(snapshot.datasets).toHaveLength(1);

      expect(snapshot.datasets[0]).toMatchObject({
        id: "xsus-science-disk-test"
      });

      expect(snapshot.datasets[0].entries).toHaveLength(1);

      // 5. Mbyll inicializuesin e parë.
      firstInstance.close();
      firstInstance = null;

      // 6. Inicializo një instancë të re nga i njëjti skedar.
      secondInstance = await initializeKnowledgeDatasets({
        filePath
      });

      expect(secondInstance.success).toBe(true);
      expect(secondInstance.restoration.success).toBe(true);
      expect(secondInstance.restoration.datasetCount).toBe(1);

      expect(secondInstance.restoration.datasetIds).toContain(
        "xsus-science-disk-test"
      );

      // 7. Verifiko dataset-in e rikthyer.
      const restoredDataset =
        secondInstance.registry.getDataset(
          "xsus-science-disk-test"
        );

      expect(restoredDataset).not.toBeNull();

      expect(restoredDataset).toMatchObject({
        id: "xsus-science-disk-test",
        datasetVersion: "2.1.0",
        entryCount: 1
      });

      expect(restoredDataset.collection[0]).toMatchObject({
        id: "photosynthesis-disk-test",
        title: "Fotosinteza",
        content:
          "Fotosinteza u mundëson bimëve të përdorin energjinë e dritës për të prodhuar lëndë ushqyese.",
        domain: "science",
        language: "sq",
        status: "verified"
      });

      // 8. Verifiko që njohuria mund të kërkohet pas rikthimit.
      const searchResult = secondInstance.registry.search(
        "fotosinteza",
        {
          language: "sq",
          domain: "science"
        }
      );

      expect(searchResult.success).toBe(true);
      expect(searchResult.metadata.resultCount).toBe(1);

      expect(searchResult.results[0]).toMatchObject({
        id: "photosynthesis-disk-test",
        title: "Fotosinteza",
        datasetId: "xsus-science-disk-test"
      });
    } finally {
      // Mbyll instancat dhe pastro skedarët edhe në rast dështimi.
      try {
        secondInstance?.close();
      } finally {
        try {
          firstInstance?.close();
        } finally {
          await rm(temporaryDirectory, {
            recursive: true,
            force: true
          });
        }
      }
    }
  });
});
