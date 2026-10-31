import { describe, it, expect, vi } from "vitest";

import {
  createModelAdapter,
  MODEL_ADAPTER_TYPES,
} from "../../src/runtime/model-adapter.js";

import {
  createModelRegistry,
  MODEL_REGISTRY_ERRORS,
} from "../../src/runtime/model-registry.js";

import {
  createModelSelector,
  MODEL_SELECTION_ERRORS,
} from "../../src/runtime/model-selector.js";

import {
  createModelRuntime,
} from "../../src/runtime/model-runtime.js";

import {
  MODEL_RUNTIME_STATES,
} from "../../src/runtime/model-contracts.js";

function createAdapter(overrides = {}) {
  return createModelAdapter({
    id: "adapter-test",
    type: MODEL_ADAPTER_TYPES.LOCAL,
    modelId: "model-test",
    initialize: vi.fn(async () => ({
      success: true,
      initialized: true,
    })),
    generate: vi.fn(async ({ prompt }) => ({
      text: `Response: ${prompt}`,
      finishReason: "stop",
    })),
    close: vi.fn(async () => ({
      success: true,
      closed: true,
    })),
    ...overrides,
  });
}

function createDeferred() {
  let resolve;
  let reject;

  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function createRegistry(adapters = []) {
  return createModelRegistry({ adapters });
}

describe("XSUS AI Core — Runtime & Registry Lifecycle Integrity", () => {
  describe("Cikli i jetës së Registry", () => {
    it("ruan gjendjen pas regjistrimeve dhe heqjeve të përsëritura", () => {
      const registry = createRegistry();

      const first = createAdapter({ id: "adapter-one" });
      const second = createAdapter({ id: "adapter-two" });
      const third = createAdapter({ id: "adapter-three" });

      registry.register(first);
      registry.register(second);

      expect(registry.getSize()).toBe(2);
      expect(registry.unregister("adapter-one")).toBe(true);
      expect(registry.unregister("adapter-one")).toBe(false);

      registry.register(third);

      expect(registry.list()).toEqual([second, third]);
      expect(registry.getSize()).toBe(2);
    });

    it("lejon regjistrimin përsëri pas heqjes së adapter-it", () => {
      const registry = createRegistry();

      const first = createAdapter({
        id: "reusable-adapter",
      });

      registry.register(first);

      expect(registry.unregister("reusable-adapter")).toBe(true);

      const replacement = createAdapter({
        id: "reusable-adapter",
        modelId: "replacement-model",
      });

      expect(registry.register(replacement)).toBe(replacement);
      expect(registry.get("reusable-adapter")).toBe(replacement);
      expect(registry.getSize()).toBe(1);
    });

    it("ruan rendin e regjistrimit pas heqjeve dinamike", () => {
      const adapters = ["one", "two", "three", "four"].map(
        (id) => createAdapter({ id: `adapter-${id}` }),
      );

      const registry = createRegistry(adapters);

      registry.unregister("adapter-two");
      registry.unregister("adapter-four");

      const fifth = createAdapter({ id: "adapter-five" });
      registry.register(fifth);

      expect(registry.list().map((adapter) => adapter.id)).toEqual([
        "adapter-one",
        "adapter-three",
        "adapter-five",
      ]);
    });

    it("pastrohet disa herë pa krijuar gjendje të pavlefshme", () => {
      const registry = createRegistry([
        createAdapter({ id: "adapter-one" }),
        createAdapter({ id: "adapter-two" }),
      ]);

      expect(registry.clear()).toBe(2);
      expect(registry.clear()).toBe(0);
      expect(registry.getSize()).toBe(0);
      expect(registry.list()).toEqual([]);
      expect(registry.getStatus().modelIds).toEqual([]);
    });

    it("nuk ndryshon kur regjistrimi i një ID-je të dyfishtë dështon", () => {
      const registry = createRegistry();

      const original = createAdapter({
        id: "duplicate-adapter",
        modelId: "original-model",
      });

      const duplicate = createAdapter({
        id: "duplicate-adapter",
        modelId: "duplicate-model",
      });

      registry.register(original);

      expect(() => registry.register(duplicate)).toThrow(
        expect.objectContaining({
          code: MODEL_REGISTRY_ERRORS.DUPLICATE_ID,
        }),
      );

      expect(registry.get("duplicate-adapter")).toBe(original);
      expect(registry.getSize()).toBe(1);
    });
  });

  describe("Përzgjedhja dinamike", () => {
    it("përfshin adapter-in e ri në përzgjedhje", () => {
      const first = createAdapter({ id: "adapter-one" });
      const registry = createRegistry([first]);
      const selector = createModelSelector({ registry });

      expect(selector.select()).toBe(first);

      const second = createAdapter({ id: "adapter-two" });
      registry.register(second);

      expect(selector.listCompatible()).toEqual([first, second]);
      expect(selector.select()).toBe(first);
    });

    it("kalon te adapter-i tjetër pas heqjes së adapter-it të parë", () => {
      const first = createAdapter({ id: "adapter-one" });
      const second = createAdapter({ id: "adapter-two" });

      const registry = createRegistry([first, second]);
      const selector = createModelSelector({ registry });

      expect(selector.select()).toBe(first);

      registry.unregister("adapter-one");

      expect(selector.select()).toBe(second);
    });

    it("përdor modelin default kur bëhet kompatibil pas regjistrimit", () => {
      const registry = createRegistry();

      const selector = createModelSelector({
        registry,
        defaultModelId: "preferred-adapter",
      });

      expect(() => selector.select()).toThrow(
        expect.objectContaining({
          code: MODEL_SELECTION_ERRORS.NO_COMPATIBLE_MODEL,
        }),
      );

      const preferred = createAdapter({
        id: "preferred-adapter",
      });

      registry.register(preferred);

      expect(selector.select()).toBe(preferred);
      expect(selector.getDefaultModel()).toBe(preferred);
    });

    it("refuzon modelin default pasi ai hiqet nga registry", () => {
      const preferred = createAdapter({
        id: "preferred-adapter",
      });

      const fallback = createAdapter({
        id: "fallback-adapter",
      });

      const registry = createRegistry([preferred, fallback]);

      const selector = createModelSelector({
        registry,
        defaultModelId: "preferred-adapter",
      });

      expect(selector.select()).toBe(preferred);

      registry.unregister("preferred-adapter");

      expect(selector.getDefaultModel()).toBeNull();
      expect(selector.select()).toBe(fallback);
    });

    it("rifreskon listën kompatibile pas ndryshimit të registry", () => {
      const first = {
        id: "english-adapter",
        languages: ["en"],
        generate: vi.fn(),
      };

      const registry = createRegistry([first]);
      const selector = createModelSelector({ registry });

      expect(selector.listCompatible({ language: "sq" })).toHaveLength(0);

      const second = {
        id: "albanian-adapter",
        languages: ["sq"],
        generate: vi.fn(),
      };

      registry.register(second);

      expect(selector.listCompatible({ language: "sq" })).toEqual([second]);
    });

    it("ruan izolimin e kërkesave pas pastrimit të registry", () => {
      const adapter = createAdapter();
      const registry = createRegistry([adapter]);
      const selector = createModelSelector({ registry });

      expect(selector.canSelect()).toBe(true);

      registry.clear();

      expect(selector.canSelect()).toBe(false);
      expect(selector.listCompatible()).toEqual([]);

      expect(() => selector.select()).toThrow(
        expect.objectContaining({
          code: MODEL_SELECTION_ERRORS.NO_COMPATIBLE_MODEL,
        }),
      );
    });
  });

  describe("Izolimi i Runtime-eve", () => {
    it("krijon dy runtime të pavarura me adapter të ndryshëm", async () => {
      const firstAdapter = createAdapter({
        id: "adapter-one",
        modelId: "model-one",
      });

      const secondAdapter = createAdapter({
        id: "adapter-two",
        modelId: "model-two",
      });

      const firstRuntime = createModelRuntime({ adapter: firstAdapter });
      const secondRuntime = createModelRuntime({ adapter: secondAdapter });

      const [firstStatus, secondStatus] = await Promise.all([
        firstRuntime.initialize(),
        secondRuntime.initialize(),
      ]);

      expect(firstStatus.modelId).toBe("model-one");
      expect(secondStatus.modelId).toBe("model-two");
      expect(firstStatus.adapterId).toBe("adapter-one");
      expect(secondStatus.adapterId).toBe("adapter-two");

      expect(firstRuntime.getState()).toBe(MODEL_RUNTIME_STATES.READY);
      expect(secondRuntime.getState()).toBe(MODEL_RUNTIME_STATES.READY);
    });

    it("mbyllja e një runtime nuk ndikon te runtime tjetër", async () => {
      const firstAdapter = createAdapter({ id: "adapter-one" });
      const secondAdapter = createAdapter({ id: "adapter-two" });

      const firstRuntime = createModelRuntime({ adapter: firstAdapter });
      const secondRuntime = createModelRuntime({ adapter: secondAdapter });

      await Promise.all([
        firstRuntime.initialize(),
        secondRuntime.initialize(),
      ]);

      await firstRuntime.close();

      expect(firstRuntime.getState()).toBe(MODEL_RUNTIME_STATES.CLOSED);
      expect(secondRuntime.getState()).toBe(MODEL_RUNTIME_STATES.READY);

      const response = await secondRuntime.generate({
        prompt: "Independent runtime",
      });

      expect(response.success).toBe(true);
      expect(response.text).toBe("Response: Independent runtime");
      expect(secondRuntime.getStatus().activeGenerations).toBe(0);
      expect(firstRuntime.getState()).toBe(MODEL_RUNTIME_STATES.CLOSED);
    });

    it("izolon dështimin e një runtime nga runtime tjetër", async () => {
      const failedAdapter = createAdapter({
        id: "failed-adapter",
        generate: vi.fn(async () => {
          throw new Error("Runtime A failed");
        }),
      });

      const healthyAdapter = createAdapter({
        id: "healthy-adapter",
      });

      const failedRuntime = createModelRuntime({ adapter: failedAdapter });
      const healthyRuntime = createModelRuntime({ adapter: healthyAdapter });

      await Promise.all([
        failedRuntime.initialize(),
        healthyRuntime.initialize(),
      ]);

      await expect(
        failedRuntime.generate({ prompt: "Failure" }),
      ).rejects.toThrow("Runtime A failed");

      const response = await healthyRuntime.generate({
        prompt: "Success",
      });

      expect(response.success).toBe(true);
      expect(response.text).toBe("Response: Success");
      expect(failedRuntime.getStatus().activeGenerations).toBe(0);
      expect(healthyRuntime.getStatus().activeGenerations).toBe(0);
    });
  });

  describe("Registry Lifecycle gjatë përdorimit", () => {
    it("ruan referencën e adapter-it pas heqjes nga registry", async () => {
      const adapter = createAdapter({ id: "active-adapter" });
      const registry = createRegistry([adapter]);
      const runtime = createModelRuntime({ adapter });

      await runtime.initialize();

      expect(registry.unregister("active-adapter")).toBe(true);
      expect(registry.has("active-adapter")).toBe(false);

      const response = await runtime.generate({
        prompt: "Existing runtime",
      });

      expect(response.success).toBe(true);
      expect(response.text).toBe("Response: Existing runtime");
      expect(runtime.getStatus().activeGenerations).toBe(0);

      await runtime.close();

      expect(runtime.getState()).toBe(MODEL_RUNTIME_STATES.CLOSED);
    });

    it("lejon adapter të ri me të njëjtën ID pas heqjes së të vjetrit", async () => {
      const oldAdapter = createAdapter({
        id: "replaceable-adapter",
        modelId: "old-model",
      });

      const registry = createRegistry([oldAdapter]);
      const oldRuntime = createModelRuntime({ adapter: oldAdapter });

      await oldRuntime.initialize();
      registry.unregister("replaceable-adapter");

      const newAdapter = createAdapter({
        id: "replaceable-adapter",
        modelId: "new-model",
      });

      registry.register(newAdapter);

      expect(registry.get("replaceable-adapter")).toBe(newAdapter);

      const newRuntime = createModelRuntime({
        adapter: registry.get("replaceable-adapter"),
      });

      const newStatus = await newRuntime.initialize();

      expect(newStatus.modelId).toBe("new-model");

      const oldResponse = await oldRuntime.generate({
        prompt: "Old runtime",
      });

      const newResponse = await newRuntime.generate({
        prompt: "New runtime",
      });

      expect(oldResponse.modelId).toBe("old-model");
      expect(newResponse.modelId).toBe("new-model");

      await Promise.all([
        oldRuntime.close(),
        newRuntime.close(),
      ]);
    });

    it("nuk mbyll automatikisht adapter-in kur hiqet nga registry", () => {
      const adapter = createAdapter();
      const registry = createRegistry([adapter]);

      registry.unregister(adapter.id);

      expect(registry.get(adapter.id)).toBeNull();
      expect(registry.getSize()).toBe(0);
    });
  });

  describe("Integriteti gjatë operacioneve paralele", () => {
    it("ruan integritetin gjatë regjistrimeve paralele të ID-ve të ndryshme", async () => {
      const registry = createRegistry();

      const adapters = Array.from(
        { length: 50 },
        (_, index) => createAdapter({
          id: `parallel-adapter-${index}`,
        }),
      );

      const results = await Promise.all(
        adapters.map(async (adapter) => registry.register(adapter)),
      );

      expect(results).toHaveLength(50);
      expect(registry.getSize()).toBe(50);
      expect(registry.list()).toHaveLength(50);
      expect(new Set(registry.getStatus().modelIds).size).toBe(50);
    });

    it("lejon vetëm një regjistrim për ID të njëjtë", async () => {
      const registry = createRegistry();

      const attempts = Array.from(
        { length: 20 },
        (_, index) => createAdapter({
          id: "shared-adapter",
          modelId: `model-${index}`,
        }),
      );

      const results = await Promise.allSettled(
        attempts.map(async (adapter) => registry.register(adapter)),
      );

      const fulfilled = results.filter(
        (result) => result.status === "fulfilled",
      );

      const rejected = results.filter(
        (result) => result.status === "rejected",
      );

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(19);
      expect(registry.getSize()).toBe(1);
      expect(registry.has("shared-adapter")).toBe(true);
    });

    it("ruan integritetin pas cikleve të përsëritura register/unregister", () => {
      const registry = createRegistry();

      for (let cycle = 0; cycle < 10; cycle += 1) {
        const adapter = createAdapter({
          id: `cycle-adapter-${cycle}`,
        });

        registry.register(adapter);
        expect(registry.has(adapter.id)).toBe(true);

        expect(registry.unregister(adapter.id)).toBe(true);
        expect(registry.has(adapter.id)).toBe(false);
      }

      expect(registry.getSize()).toBe(0);
      expect(registry.list()).toEqual([]);
    });

    it("ruan përzgjedhjen e saktë gjatë regjistrimeve të shumta", () => {
      const registry = createRegistry();

      const selector = createModelSelector({
        registry,
        defaultModelId: "adapter-25",
      });

      const adapters = Array.from(
        { length: 50 },
        (_, index) => createAdapter({
          id: `adapter-${index}`,
        }),
      );

      adapters.forEach((adapter) => registry.register(adapter));

      expect(selector.select()).toBe(adapters[25]);
      expect(selector.listCompatible()).toHaveLength(50);

      registry.unregister("adapter-25");

      expect(selector.select()).toBe(adapters[0]);
      expect(selector.listCompatible()).toHaveLength(49);
    });
  });

  describe("Lifecycle Recovery", () => {
    it("ruan runtime-in aktiv kur një gjenerim tjetër dështon", async () => {
      const deferred = createDeferred();

      const generate = vi.fn()
        .mockImplementationOnce(() => deferred.promise)
        .mockRejectedValueOnce(new Error("Parallel failure"));

      const adapter = createAdapter({ generate });
      const runtime = createModelRuntime({ adapter });

      await runtime.initialize();

      const first = runtime.generate({
        prompt: "Successful request",
      });

      const second = runtime.generate({
        prompt: "Failing request",
      });

      await expect(second).rejects.toThrow("Parallel failure");

      expect(runtime.getStatus().activeGenerations).toBe(1);

      deferred.resolve({
        text: "Recovered response",
        finishReason: "stop",
      });

      const response = await first;

      expect(response.success).toBe(true);
      expect(response.text).toBe("Recovered response");

      expect(runtime.getStatus()).toMatchObject({
        state: MODEL_RUNTIME_STATES.READY,
        activeGenerations: 0,
        lastError: null,
      });

      await runtime.close();
    });

    it("mbyll runtime-in dhe pastron burimet pas dështimit të gjenerimit", async () => {
      const adapter = createAdapter({
        generate: vi.fn(async () => {
          throw new Error("Expected generation failure");
        }),
      });

      const runtime = createModelRuntime({ adapter });

      await runtime.initialize();

      await expect(
        runtime.generate({ prompt: "Failure" }),
      ).rejects.toThrow("Expected generation failure");

      expect(runtime.getStatus().activeGenerations).toBe(0);

      const status = await runtime.close();

      expect(status.state).toBe(MODEL_RUNTIME_STATES.CLOSED);
      expect(status.activeGenerations).toBe(0);
      expect(runtime.getState()).toBe(MODEL_RUNTIME_STATES.CLOSED);
    });
  });
});
