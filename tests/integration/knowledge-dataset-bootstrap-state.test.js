import { describe, it, expect, vi } from "vitest";

import {
  initializeKnowledgeDatasets
} from "../../src/knowledge/knowledge-dataset-bootstrap.js";

describe("XSUS AI — Knowledge Dataset Bootstrap State", () => {
  function createStorageAdapter() {
    return {
      loadDatasets: vi.fn().mockResolvedValue({
        success: true,
        datasets: []
      }),

      saveDatasets: vi.fn().mockResolvedValue({
        success: true
      })
    };
  }

  it("refuzon ruajtjen pas mbylljes", async () => {
    const storageAdapter = createStorageAdapter();

    const instance = await initializeKnowledgeDatasets({
      storageAdapter
    });

    expect(instance.close()).toBe(true);

    await expect(
      instance.save()
    ).rejects.toThrow(
      "Inicializuesi i dataset-eve është mbyllur."
    );

    expect(storageAdapter.saveDatasets).not.toHaveBeenCalled();
  });

  it("mbyllja e përsëritur nuk e ndryshon gjendjen", async () => {
    const storageAdapter = createStorageAdapter();

    const instance = await initializeKnowledgeDatasets({
      storageAdapter
    });

    expect(instance.close()).toBe(true);
    expect(instance.close()).toBe(false);
    expect(instance.close()).toBe(false);

    await expect(
      instance.save()
    ).rejects.toThrow(
      "Inicializuesi i dataset-eve është mbyllur."
    );
  });

  it("ruan dataset-et kur inicializuesi është aktiv", async () => {
    const storageAdapter = createStorageAdapter();

    const instance = await initializeKnowledgeDatasets({
      storageAdapter
    });

    const result = await instance.save();

    expect(result.success).toBe(true);
    expect(storageAdapter.saveDatasets).toHaveBeenCalledTimes(1);

    instance.close();
  });
});
