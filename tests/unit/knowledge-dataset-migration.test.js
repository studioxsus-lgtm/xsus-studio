
import { describe, expect, test, vi } from "vitest";

import {
  createKnowledgeDatasetMigration,
  compareVersions,
  validateDataset
} from "../../src/knowledge/knowledge-dataset-migration.js";

function createDataset({
  id = "sq-knowledge",
  schemaVersion = "1.0.0",
  entries = [
    {
      id: "sq-001",
      title: "Titull",
      content: "Përmbajtje në shqip.",
      language: "sq",
      domain: "general"
    }
  ] = {}
} = {}) {
  return {
    id,
    schemaVersion,
    entries
  };
}

describe("XSUS AI — Knowledge Dataset Migration", () => {
  test("krahason saktë versionet semver", () => {
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
    expect(compareVersions("1.0.0", "1.1.0")).toBe(-1);
    expect(compareVersions("2.0.0", "1.9.9")).toBe(1);
  });

  test("refuzon versione të pavlefshme", () => {
    expect(() => compareVersions("1.0", "1.0.0")).toThrow();
    expect(() => compareVersions("v1.0.0", "1.0.0")).toThrow();
  });

  test("validon strukturën bazë të dataset-it", () => {
    expect(validateDataset(createDataset()).valid).toBe(true);

    expect(
      validateDataset({
        id: "",
        schemaVersion: "1.0.0",
        entries: []
      }).valid
    ).toBe(false);
  });

  test("regjistron një migrim të vlefshëm", () => {
    const migration = createKnowledgeDatasetMigration();

    const result = migration.registerMigration({
      fromVersion: "1.0.0",
      toVersion: "1.1.0",
      migrate: (dataset) => dataset
    });

    expect(result.success).toBe(true);
    expect(migration.listMigrations()).toEqual([
      {
        fromVersion: "1.0.0",
        toVersion: "1.1.0"
      }
    ]);
  });

  test("refuzon migrimin me version të synuar më të ulët", () => {
    const migration = createKnowledgeDatasetMigration();

    expect(() =>
      migration.registerMigration({
        fromVersion: "2.0.0",
        toVersion: "1.0.0",
        migrate: (dataset) => dataset
      })
    ).toThrow();
  });

  test("refuzon regjistrimin e dyfishtë të të njëjtit migrim", () => {
    const migration = createKnowledgeDatasetMigration();

    const definition = {
      fromVersion: "1.0.0",
      toVersion: "1.1.0",
      migrate: (dataset) => dataset
    };

    migration.registerMigration(definition);

    expect(() =>
      migration.registerMigration(definition)
    ).toThrow();
  });

  test("migrimi përditëson versionin dhe ruan përmbajtjen", async () => {
    const migration = createKnowledgeDatasetMigration();

    migration.registerMigration({
      fromVersion: "1.0.0",
      toVersion: "1.1.0",
      migrate: (dataset) => ({
        ...dataset,
        entries: dataset.entries.map((entry) => ({
          ...entry,
          category: "general"
        }))
      })
    });

    const source = createDataset();

    const result = await migration.migrateDataset(source, {
      targetVersion: "1.1.0"
    });

    expect(result.success).toBe(true);
    expect(result.migrated).toBe(true);
    expect(result.dataset.schemaVersion).toBe("1.1.0");
    expect(result.dataset.entries[0].content).toBe(
      "Përmbajtje në shqip."
    );
    expect(result.dataset.entries[0].category).toBe("general");
    expect(source.schemaVersion).toBe("1.0.0");
    expect(source.entries[0].category).toBeUndefined();
  });

  test("ekzekuton zinxhirin e migrimeve në rendin e duhur", async () => {
    const migration = createKnowledgeDatasetMigration();

    migration.registerMigration({
      fromVersion: "1.0.0",
      toVersion: "1.1.0",
      migrate: (dataset) => ({
        ...dataset,
        entries: dataset.entries.map((entry) => ({
          ...entry,
          stepOne: true
        }))
      })
    });

    migration.registerMigration({
      fromVersion: "1.1.0",
      toVersion: "2.0.0",
      migrate: (dataset) => ({
        ...dataset,
        entries: dataset.entries.map((entry) => ({
          ...entry,
          stepTwo: true
        }))
      })
    });

    const result = await migration.migrateDataset(
      createDataset(),
      { targetVersion: "2.0.0" }
    );

    expect(result.success).toBe(true);
    expect(result.metadata.migrationsApplied).toBe(2);
    expect(result.dataset.schemaVersion).toBe("2.0.0");
    expect(result.dataset.entries[0].stepOne).toBe(true);
    expect(result.dataset.entries[0].stepTwo).toBe(true);
  });

  test("dështon kur mungon një hap i migrimit", async () => {
    const migration = createKnowledgeDatasetMigration();

    migration.registerMigration({
      fromVersion: "1.0.0",
      toVersion: "1.1.0",
      migrate: (dataset) => dataset
    });

    const result = await migration.migrateDataset(
      createDataset(),
      { targetVersion: "2.0.0" }
    );

    expect(result.success).toBe(false);
    expect(result.migrated).toBe(false);
    expect(result.error).toContain("Mungon migrimi");
  });

  test("ruan burimin kur funksioni i migrimit hedh gabim", async () => {
    const migration = createKnowledgeDatasetMigration();

    migration.registerMigration({
      fromVersion: "1.0.0",
      toVersion: "1.1.0",
      migrate: () => {
        throw new Error("Gabim i simuluar.");
      }
    });

    const source = createDataset();
    const snapshot = structuredClone(source);

    const result = await migration.migrateDataset(source, {
      targetVersion: "1.1.0"
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Gabim i simuluar.");
    expect(result.metadata.originalPreserved).toBe(true);
    expect(source).toEqual(snapshot);
  });

  test("refuzon rezultatin e pavlefshëm të migrimit", async () => {
    const migration = createKnowledgeDatasetMigration();

    migration.registerMigration({
      fromVersion: "1.0.0",
      toVersion: "1.1.0",
      migrate: (dataset) => ({
        ...dataset,
        entries: [
          {
            id: "invalid-001",
            title: "Pa përmbajtje"
          }
        ]
      })
    });

    const result = await migration.migrateDataset(
      createDataset(),
      { targetVersion: "1.1.0" }
    );

    expect(result.success).toBe(false);
    expect(result.metadata.originalPreserved).toBe(true);
  });

  test("nuk migron dataset që është tashmë në versionin e synuar", async () => {
    const migration = createKnowledgeDatasetMigration();
    const source = createDataset({ schemaVersion: "1.0.0" });

    const result = await migration.migrateDataset(source, {
      targetVersion: "1.0.0"
    });

    expect(result.success).toBe(true);
    expect(result.migrated).toBe(false);
    expect(result.metadata.migrationsApplied).toBe(0);
  });

  test("refuzon migrimin prapa", async () => {
    const migration = createKnowledgeDatasetMigration();

    const result = await migration.migrateDataset(
      createDataset({ schemaVersion: "2.0.0" }),
      { targetVersion: "1.0.0" }
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Migrimi prapa");
  });

  test("mbështet migrime asinkrone", async () => {
    const migration = createKnowledgeDatasetMigration();

    migration.registerMigration({
      fromVersion: "1.0.0",
      toVersion: "1.1.0",
      migrate: async (dataset) => ({
        ...dataset,
        entries: dataset.entries.map((entry) => ({
          ...entry,
          asyncMigration: true
        }))
      })
    });

    const result = await migration.migrateDataset(
      createDataset(),
      { targetVersion: "1.1.0" }
    );

    expect(result.success).toBe(true);
    expect(result.dataset.entries[0].asyncMigration).toBe(true);
  });
});
