
import { afterEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  initializeKnowledgeDatasets
} from "../../src/knowledge/knowledge-dataset-bootstrap.js";

describe("Knowledge Dataset Bootstrap", () => {
  let directory;
  let bootstrap;

  afterEach(async () => {
    bootstrap?.close();
    bootstrap = undefined;

    if (directory) {
      await rm(directory, {
        recursive: true,
        force: true
      });
      directory = undefined;
    }
  });

  async function createBootstrap() {
    directory = await mkdtemp(
      join(tmpdir(), "xsus-knowledge-")
    );

    bootstrap = await initializeKnowledgeDatasets({
      filePath: join(directory, "datasets.json")
    });

    return bootstrap;
  }

  test("inicializohet pa dataset-e të ruajtura", async () => {
    const instance = await createBootstrap();

    expect(instance.success).toBe(true);
    expect(instance.registry).toBeDefined();
    expect(instance.persistence).toBeDefined();
    expect(instance.integration).toBeDefined();
  });

  test("ofron metadata të inicializuesit", async () => {
    const instance = await createBootstrap();

    expect(instance.getMetadata()).toEqual({
      engine: "xsus-knowledge-dataset-bootstrap",
      version: "1.0.0"
    });
  });

  test("mbyllet pa çregjistrim të dyfishtë", async () => {
    const instance = await createBootstrap();

    expect(instance.close()).toBe(true);
    expect(instance.close()).toBe(false);
  });

  test("refuzon filePath të pavlefshëm", async () => {
    await expect(
      initializeKnowledgeDatasets({})
    ).rejects.toThrow(TypeError);
  });
});
