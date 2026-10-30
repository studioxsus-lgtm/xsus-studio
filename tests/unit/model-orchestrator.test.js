import { describe, it, expect, vi } from "vitest";

import {
  createModelOrchestrator,
  MODEL_ORCHESTRATOR_VERSION,
  MODEL_ORCHESTRATOR_ERRORS,
} from "../../src/runtime/model-orchestrator.js";

import {
  createModelRegistry,
} from "../../src/runtime/model-registry.js";

import {
  createModelSelector,
} from "../../src/runtime/model-selector.js";

function createAdapter(id, overrides = {}) {
  return {
    id,
    type: "local",
    modelId: `model-${id}`,
    version: "1.0.0",
    available: true,
    languages: ["sq", "en"],
    capabilities: ["chat", "knowledge"],

    async initialize() {},

    async generate(input) {
      return {
        text: `Përgjigjja për: ${input.prompt ?? "test"}`,
      };
    },

    async close() {},

    ...overrides,
  };
}

function createSetup(adapters = [], options = {}) {
  const registry = createModelRegistry({ adapters });

  const selector = createModelSelector({
    registry,
    defaultModelId: options.defaultModelId ?? null,
  });

  const orchestrator = createModelOrchestrator({
    registry,
    selector,
    ...(options.defaultModelId !== undefined
      ? { defaultModelId: options.defaultModelId }
      : {}),
  });

  return {
    registry,
    selector,
    orchestrator,
  };
}

function createDeferred() {
  let resolve;
  let reject;

  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

describe("XSUS AI Core — Model Orchestrator", () => {
  it("ekspozon version-in e saktë", () => {
    const { orchestrator } = createSetup();

    expect(MODEL_ORCHESTRATOR_VERSION).toBe("1.0.0");
    expect(orchestrator.getStatus().version).toBe("1.0.0");
  });

  it("refuzon konfigurimin e pavlefshëm", () => {
    expect(() => createModelOrchestrator(null)).toThrow(
      expect.objectContaining({
        code: MODEL_ORCHESTRATOR_ERRORS.INVALID_CONFIGURATION,
      }),
    );

    expect(() => createModelOrchestrator([])).toThrow(
      expect.objectContaining({
        code: MODEL_ORCHESTRATOR_ERRORS.INVALID_CONFIGURATION,
      }),
    );

    expect(() => createModelOrchestrator({})).toThrow(
      expect.objectContaining({
        code: MODEL_ORCHESTRATOR_ERRORS.INVALID_CONFIGURATION,
      }),
    );
  });

  it("refuzon Model Registry të pavlefshëm", () => {
    expect(() =>
      createModelOrchestrator({
        registry: {},
        selector: {
          select: vi.fn(),
        },
      }),
    ).toThrow(
      expect.objectContaining({
        code: MODEL_ORCHESTRATOR_ERRORS.INVALID_CONFIGURATION,
      }),
    );
  });

  it("refuzon Model Selector të pavlefshëm", () => {
    const registry = createModelRegistry();

    expect(() =>
      createModelOrchestrator({
        registry,
        selector: {},
      }),
    ).toThrow(
      expect.objectContaining({
        code: MODEL_ORCHESTRATOR_ERRORS.INVALID_CONFIGURATION,
      }),
    );
  });

  it("refuzon defaultModelId të pavlefshëm", () => {
    const registry = createModelRegistry();

    const selector = createModelSelector({
      registry,
    });

    expect(() =>
      createModelOrchestrator({
        registry,
        selector,
        defaultModelId: "   ",
      }),
    ).toThrow(
      expect.objectContaining({
        code: MODEL_ORCHESTRATOR_ERRORS.INVALID_CONFIGURATION,
      }),
    );
  });

  it("inicializon një model të regjistruar", async () => {
    const adapter = createAdapter("model-a");

    const { orchestrator } = createSetup([adapter]);

    const result = await orchestrator.initialize("model-a");

    expect(result).toBeDefined();

    expect(
      orchestrator.getRuntimeStatus("model-a"),
    ).not.toBeNull();

    expect(
      orchestrator.getStatus().activeRuntimes,
    ).toBe(1);
  });

  it("inicializon modelin e përzgjedhur kur nuk jepet ID", async () => {
    const adapter = createAdapter("model-a");

    const { orchestrator } = createSetup([adapter]);

    await orchestrator.initialize();

    expect(
      orchestrator.getRuntimeStatus("model-a"),
    ).not.toBeNull();
  });

  it("kthen gabim kur modeli për inicializim nuk ekziston", async () => {
    const { orchestrator } = createSetup([
      createAdapter("model-a"),
    ]);

    await expect(
      orchestrator.initialize("missing-model"),
    ).rejects.toMatchObject({
      code: MODEL_ORCHESTRATOR_ERRORS.MODEL_NOT_FOUND,
    });
  });

  it("gjeneron përgjigje përmes runtime", async () => {
    const adapter = createAdapter("model-a");

    const { orchestrator } = createSetup([adapter]);

    const result = await orchestrator.generate({
      modelId: "model-a",
      prompt: "Përshëndetje",
    });

    expect(result).toMatchObject({
      text: "Përgjigjja për: Përshëndetje",
    });

    expect(
      orchestrator.getStatus().activeRuntimes,
    ).toBe(1);
  });

  it("përdor modelin e parazgjedhur të orchestrator-it", async () => {
    const adapterA = createAdapter("model-a");
    const adapterB = createAdapter("model-b");

    const { orchestrator } = createSetup(
      [adapterA, adapterB],
      {
        defaultModelId: "model-b",
      },
    );

    const result = await orchestrator.generate({
      prompt: "Test",
    });

    expect(result).toMatchObject({
      text: "Përgjigjja për: Test",
    });

    expect(
      orchestrator.getRuntimeStatus("model-b"),
    ).not.toBeNull();

    expect(
      orchestrator.getRuntimeStatus("model-a"),
    ).toBeNull();
  });

  it("refuzon kërkesat për gjenerim që nuk janë objekte të thjeshta", async () => {
    const { orchestrator } = createSetup([
      createAdapter("model-a"),
    ]);

    await expect(
      orchestrator.generate(null),
    ).rejects.toMatchObject({
      code: MODEL_ORCHESTRATOR_ERRORS.INVALID_CONFIGURATION,
    });

    await expect(
      orchestrator.generate([]),
    ).rejects.toMatchObject({
      code: MODEL_ORCHESTRATOR_ERRORS.INVALID_CONFIGURATION,
    });
  });

  it("e mbështjell gabimin e përzgjedhjes me kodin e orchestrator-it", async () => {
    const { orchestrator } = createSetup([
      createAdapter("model-a"),
    ]);

    await expect(
      orchestrator.generate({
        modelId: "missing-model",
        prompt: "Test",
      }),
    ).rejects.toMatchObject({
      code: MODEL_ORCHESTRATOR_ERRORS.MODEL_NOT_FOUND,
    });
  });

  it("kthen statuset e runtime-ve", async () => {
    const { orchestrator } = createSetup([
      createAdapter("model-a"),
      createAdapter("model-b"),
    ]);

    await orchestrator.initialize("model-a");
    await orchestrator.initialize("model-b");

    const statuses = orchestrator.listRuntimeStatuses();

    expect(statuses).toHaveLength(2);

    expect(
      statuses.map((status) => status.adapterId),
    ).toEqual([
      "model-a",
      "model-b",
    ]);
  });

  it("kthen null kur runtime nuk është krijuar", () => {
    const { orchestrator } = createSetup([
      createAdapter("model-a"),
    ]);

    expect(
      orchestrator.getRuntimeStatus("model-a"),
    ).toBeNull();
  });

  it("refuzon ID të pavlefshme në getRuntimeStatus", () => {
    const { orchestrator } = createSetup();

    expect(
      () => orchestrator.getRuntimeStatus(""),
    ).toThrow(TypeError);

    expect(
      () => orchestrator.getRuntimeStatus("   "),
    ).toThrow(TypeError);
  });

  it("mbyll runtime-t dhe raporton numrin e tyre", async () => {
    const { orchestrator } = createSetup([
      createAdapter("model-a"),
      createAdapter("model-b"),
    ]);

    await orchestrator.initialize("model-a");
    await orchestrator.initialize("model-b");

    const result = await orchestrator.close();

    expect(result).toMatchObject({
      success: true,
      closed: true,
      runtimesClosed: 2,
      failures: [],
    });

    expect(
      orchestrator.getStatus().closed,
    ).toBe(true);

    expect(
      orchestrator.getStatus().activeRuntimes,
    ).toBe(0);
  });

  it("lejon thirrje të përsëritura të close pa dështim", async () => {
    const { orchestrator } = createSetup([
      createAdapter("model-a"),
    ]);

    await orchestrator.initialize("model-a");

    const first = await orchestrator.close();
    const second = await orchestrator.close();

    expect(first.closed).toBe(true);
    expect(second.closed).toBe(true);
  });

  it("refuzon inicializimin pas mbylljes", async () => {
    const { orchestrator } = createSetup([
      createAdapter("model-a"),
    ]);

    await orchestrator.close();

    await expect(
      orchestrator.initialize("model-a"),
    ).rejects.toMatchObject({
      code: MODEL_ORCHESTRATOR_ERRORS.CLOSED,
    });
  });

  it("refuzon gjenerimin pas mbylljes", async () => {
    const { orchestrator } = createSetup([
      createAdapter("model-a"),
    ]);

    await orchestrator.close();

    await expect(
      orchestrator.generate({
        prompt: "Test",
      }),
    ).rejects.toMatchObject({
      code: MODEL_ORCHESTRATOR_ERRORS.CLOSED,
    });
  });

  it("ekspozon një API të ngrirë", () => {
    const { orchestrator } = createSetup();

    expect(Object.isFrozen(orchestrator)).toBe(true);
  });

  // --------------------------------------------------
  // HARDENING — INITIALIZATION
  // --------------------------------------------------

  it("përcjell gabimin kur inicializimi i adapter-it dështon", async () => {
    const adapter = createAdapter("model-a", {
      async initialize() {
        throw new Error("Initialization failed");
      },
    });

    const { orchestrator } = createSetup([adapter]);

    await expect(
      orchestrator.initialize("model-a"),
    ).rejects.toMatchObject({
      message: "Initialization failed",
    });

    expect(
      orchestrator.getRuntimeStatus("model-a").state,
    ).toBe("error");
  });

  it("bashkon inicializimet paralele të të njëjtit model", async () => {
    const initializationGate = createDeferred();
    const initializationStarted = createDeferred();

    let initializationCount = 0;

    const adapter = createAdapter("model-a", {
      async initialize() {
        initializationCount += 1;
        initializationStarted.resolve();

        await initializationGate.promise;
      },
    });

    const { orchestrator } = createSetup([adapter]);

    const first = orchestrator.initialize("model-a");
    const second = orchestrator.initialize("model-a");

    await initializationStarted.promise;

    expect(initializationCount).toBe(1);

    initializationGate.resolve();

    await Promise.all([first, second]);

    expect(initializationCount).toBe(1);

    expect(
      orchestrator.getRuntimeStatus("model-a").initialized,
    ).toBe(true);
  });

  // --------------------------------------------------
  // HARDENING — GENERATION
  // --------------------------------------------------

  it("e mbështjell gabimin e gjenerimit me kodin e duhur", async () => {
    const adapter = createAdapter("model-a", {
      async generate() {
        throw new Error("Inference failed");
      },
    });

    const { orchestrator } = createSetup([adapter]);

    await expect(
      orchestrator.generate({
        modelId: "model-a",
        prompt: "Test",
      }),
    ).rejects.toMatchObject({
      code: MODEL_ORCHESTRATOR_ERRORS.GENERATION_FAILED,
      message: "Inference failed",
      cause: expect.any(Error),
    });
  });

  // --------------------------------------------------
  // HARDENING — RUNTIME CREATION
  // --------------------------------------------------

  it("ruan shkakun kur krijimi i runtime dështon", async () => {
    const registry = {
      get: vi.fn(),
      list: vi.fn(() => [{ id: "model-a" }]),
    };

    const selector = {
      select: vi.fn(() => ({
        id: "model-a",
        modelId: "model-a",
      })),
    };

    const orchestrator = createModelOrchestrator({
      registry,
      selector,
    });

    await expect(
      orchestrator.initialize("model-a"),
    ).rejects.toMatchObject({
      code: MODEL_ORCHESTRATOR_ERRORS.RUNTIME_CREATION_FAILED,
      cause: expect.any(Error),
    });
  });

  // --------------------------------------------------
  // HARDENING — CLOSE FAILURE
  // --------------------------------------------------

  it("raporton dështimet e runtime-ve gjatë mbylljes", async () => {
    const adapterA = createAdapter("model-a", {
      async close() {
        throw new Error("Close failed");
      },
    });

    const adapterB = createAdapter("model-b");

    const { orchestrator } = createSetup([
      adapterA,
      adapterB,
    ]);

    await orchestrator.initialize("model-a");
    await orchestrator.initialize("model-b");

    const result = await orchestrator.close();

    expect(result.success).toBe(false);
    expect(result.closed).toBe(true);
    expect(result.runtimesClosed).toBe(2);

    expect(result.failures).toHaveLength(1);

    expect(result.failures[0].message).toBe("Close failed");

    expect(
      orchestrator.getStatus().activeRuntimes,
    ).toBe(0);
  });

  // --------------------------------------------------
  // HARDENING — CLOSE DURING INITIALIZATION
  // --------------------------------------------------

  it("pret përfundimin e inicializimit aktiv gjatë mbylljes", async () => {
    const initializationGate = createDeferred();
    const initializationStarted = createDeferred();

    const adapter = createAdapter("model-a", {
      async initialize() {
        initializationStarted.resolve();

        await initializationGate.promise;
      },
    });

    const { orchestrator } = createSetup([adapter]);

    const initialization = orchestrator.initialize("model-a");

    await initializationStarted.promise;

    const closing = orchestrator.close();

    initializationGate.resolve();

    await expect(initialization).rejects.toBeDefined();

    const closeResult = await closing;

    expect(closeResult.closed).toBe(true);

    expect(
      orchestrator.getStatus().activeRuntimes,
    ).toBe(0);
  });

  // --------------------------------------------------
  // HARDENING — CLOSE DURING GENERATION
  // --------------------------------------------------

  it("pret përfundimin e gjenerimit aktiv gjatë mbylljes", async () => {
    const generationGate = createDeferred();
    const generationStarted = createDeferred();

    const adapter = createAdapter("model-a", {
      async generate() {
        generationStarted.resolve();

        await generationGate.promise;

        return {
          text: "Përgjigje e përfunduar",
        };
      },
    });

    const { orchestrator } = createSetup([adapter]);

    const generation = orchestrator.generate({
      modelId: "model-a",
      prompt: "Test",
    });

    await generationStarted.promise;

    const closing = orchestrator.close();

    generationGate.resolve();

    await expect(generation).rejects.toMatchObject({
      code: MODEL_ORCHESTRATOR_ERRORS.GENERATION_FAILED,
    });

    const closeResult = await closing;

    expect(closeResult.closed).toBe(true);

    expect(
      orchestrator.getStatus().activeRuntimes,
    ).toBe(0);
  });
});
