import { describe, it, expect, vi } from "vitest";

import {
  createModelAdapter,
} from "../../src/runtime/model-adapter.js";

import {
  createModelRegistry,
} from "../../src/runtime/model-registry.js";

import {
  createModelSelector,
} from "../../src/runtime/model-selector.js";

import {
  createModelOrchestrator,
  MODEL_ORCHESTRATOR_VERSION,
} from "../../src/runtime/model-orchestrator.js";

function createTestSystem(options = {}) {
  const {
    adapterId = "test-model",
    modelId = adapterId,
    generate = vi.fn(async () => ({
      text: "Përgjigje nga modeli testues.",
      modelId,
      language: "sq",
    })),
    initialize,
    close,
    getStatus,
    defaultModelId = modelId,
  } = options;

  const adapter = createModelAdapter({
    id: adapterId,
    modelId,
    type: "custom",
    generate,
    ...(initialize ? { initialize } : {}),
    ...(close ? { close } : {}),
    ...(getStatus ? { getStatus } : {}),
  });

  const registry = createModelRegistry({
    adapters: [adapter],
  });

  const selector = createModelSelector({
    registry,
    defaultModelId,
  });

  const orchestrator = createModelOrchestrator({
    registry,
    selector,
    defaultModelId,
  });

  return {
    adapter,
    registry,
    selector,
    orchestrator,
    generate,
  };
}

describe("XSUS AI Core — Model Orchestrator Integration", () => {
  it("lidh adapter, registry, selector, orchestrator dhe runtime", async () => {
    const system = createTestSystem();

    expect(system.registry.get("test-model")).toBe(
      system.adapter,
    );

    const selected = system.selector.select({
      modelId: "test-model",
    });

    expect(selected).toBe(system.adapter);

    const result = await system.orchestrator.generate({
      prompt: "Përshëndetje XSUS AI.",
      language: "sq",
    });

    expect(result.text).toBe(
      "Përgjigje nga modeli testues.",
    );

    expect(result.modelId).toBe("test-model");
    expect(system.generate).toHaveBeenCalledTimes(1);

    expect(
      system.orchestrator.getRuntimeStatus("test-model"),
    ).not.toBeNull();
  });

  it("inicializon modelin përmes orchestrator", async () => {
    const initialize = vi.fn(async () => ({
      success: true,
      initialized: true,
    }));

    const system = createTestSystem({
      initialize,
    });

    const result = await system.orchestrator.initialize(
      "test-model",
    );

    expect(result.success).toBe(true);
    expect(initialize).toHaveBeenCalledTimes(1);

    const status =
      system.orchestrator.getRuntimeStatus("test-model");

    expect(status).not.toBeNull();
    expect(status.state).toBe("ready");
  });

  it("përdor modelin parazgjedhur kur modelId nuk specifikohet", async () => {
    const system = createTestSystem();

    const result = await system.orchestrator.generate({
      prompt: "Test i modelit parazgjedhur.",
      language: "sq",
    });

    expect(result.modelId).toBe("test-model");
    expect(system.generate).toHaveBeenCalledTimes(1);
  });

  it("nuk inicializon përsëri runtime-in për çdo gjenerim", async () => {
    const initialize = vi.fn(async () => ({
      success: true,
      initialized: true,
    }));

    const system = createTestSystem({
      initialize,
    });

    await system.orchestrator.generate({
      prompt: "Kërkesa e parë.",
      language: "sq",
    });

    await system.orchestrator.generate({
      prompt: "Kërkesa e dytë.",
      language: "sq",
    });

    expect(initialize).toHaveBeenCalledTimes(1);
    expect(system.generate).toHaveBeenCalledTimes(2);
  });

  it("menaxhon gjenerime të njëpasnjëshme", async () => {
    const system = createTestSystem();

    const first = await system.orchestrator.generate({
      prompt: "Pyetja e parë.",
      language: "sq",
    });

    const second = await system.orchestrator.generate({
      prompt: "Pyetja e dytë.",
      language: "sq",
    });

    expect(first.text).toBe(
      "Përgjigje nga modeli testues.",
    );

    expect(second.text).toBe(
      "Përgjigje nga modeli testues.",
    );

    expect(system.generate).toHaveBeenCalledTimes(2);
  });

  it("përfundon me sukses ciklin e mbylljes së runtime-it", async () => {
    const close = vi.fn(async () => ({
      success: true,
      closed: true,
    }));

    const system = createTestSystem({
      close,
    });

    await system.orchestrator.generate({
      prompt: "Test para mbylljes.",
      language: "sq",
    });

    const result = await system.orchestrator.close();

    expect(result.success).toBe(true);
    expect(result.closed).toBe(true);
    expect(result.runtimesClosed).toBe(1);
    expect(close).toHaveBeenCalledTimes(1);

    expect(system.orchestrator.getStatus().closed).toBe(
      true,
    );
  });

  it("refuzon gjenerimin pas mbylljes së orchestrator", async () => {
    const system = createTestSystem();

    await system.orchestrator.close();

    await expect(
      system.orchestrator.generate({
        prompt: "Kërkesë pas mbylljes.",
        language: "sq",
      }),
    ).rejects.toMatchObject({
      code: "MODEL_ORCHESTRATOR_CLOSED",
    });

    expect(system.generate).not.toHaveBeenCalled();
  });

  it("standardizon gabimet e gjenerimit", async () => {
    const generate = vi.fn(async () => {
      throw new Error("Dështim i modelit testues.");
    });

    const system = createTestSystem({
      generate,
    });

    await expect(
      system.orchestrator.generate({
        prompt: "Test gabimi.",
        language: "sq",
      }),
    ).rejects.toMatchObject({
      code: "MODEL_ORCHESTRATOR_GENERATION_FAILED",
      message: "Dështim i modelit testues.",
    });

    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("raporton gabim kur modeli nuk gjendet", async () => {
    const system = createTestSystem();

    await expect(
      system.orchestrator.generate({
        prompt: "Test modeli që mungon.",
        modelId: "missing-model",
        language: "sq",
      }),
    ).rejects.toMatchObject({
      code: "MODEL_ORCHESTRATOR_MODEL_NOT_FOUND",
    });

    expect(system.generate).not.toHaveBeenCalled();
  });

  it("raporton statusin e orchestrator dhe runtime-it", async () => {
    const system = createTestSystem();

    const initialStatus = system.orchestrator.getStatus();

    expect(initialStatus.version).toBe(
      MODEL_ORCHESTRATOR_VERSION,
    );

    expect(initialStatus.closed).toBe(false);
    expect(initialStatus.registeredModels).toBe(1);
    expect(initialStatus.activeRuntimes).toBe(0);

    await system.orchestrator.generate({
      prompt: "Kontrollo statusin.",
      language: "sq",
    });

    const updatedStatus = system.orchestrator.getStatus();

    expect(updatedStatus.activeRuntimes).toBe(1);

    const runtimeStatuses =
      system.orchestrator.listRuntimeStatuses();

    expect(runtimeStatuses).toHaveLength(1);
    expect(runtimeStatuses[0].adapterId).toBe("test-model");
  });

  it("lejon thirrje të përsëritura për close pa mbyllje të dyfishtë", async () => {
    const close = vi.fn(async () => ({
      success: true,
      closed: true,
    }));

    const system = createTestSystem({
      close,
    });

    await system.orchestrator.generate({
      prompt: "Përgatit runtime-in.",
      language: "sq",
    });

    const firstClose = await system.orchestrator.close();
    const secondClose = await system.orchestrator.close();

    expect(firstClose.success).toBe(true);
    expect(secondClose.closed).toBe(true);
    expect(close).toHaveBeenCalledTimes(1);
  });
});
