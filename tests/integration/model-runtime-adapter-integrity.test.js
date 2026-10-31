import { describe, it, expect, vi } from "vitest";

import {
  createModelAdapter,
  MODEL_ADAPTER_VERSION,
  MODEL_ADAPTER_TYPES,
} from "../../src/runtime/model-adapter.js";

import {
  createModelRegistry,
  MODEL_REGISTRY_VERSION,
  MODEL_REGISTRY_ERRORS,
} from "../../src/runtime/model-registry.js";

import {
  createModelSelector,
  MODEL_SELECTOR_VERSION,
  MODEL_SELECTION_ERRORS,
} from "../../src/runtime/model-selector.js";

import {
  createModelRuntime,
  MODEL_RUNTIME_VERSION,
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

function createRegistry(adapters = []) {
  return createModelRegistry({ adapters });
}

describe("XSUS AI Core — Runtime & Adapter Integration Integrity", () => {
  describe("Model Adapter", () => {
    it("krijon adapter me konfigurim standard", () => {
      const adapter = createAdapter();

      expect(adapter).toMatchObject({
        id: "adapter-test",
        type: MODEL_ADAPTER_TYPES.LOCAL,
        modelId: "model-test",
        version: MODEL_ADAPTER_VERSION,
      });

      expect(Object.isFrozen(adapter)).toBe(true);
    });

    it("refuzon konfigurim të pavlefshëm", () => {
      expect(() => createModelAdapter(null)).toThrow(TypeError);
      expect(() => createModelAdapter([])).toThrow(TypeError);
      expect(() => createModelAdapter("invalid")).toThrow(TypeError);
    });

    it("refuzon ID bosh", () => {
      expect(() =>
        createModelAdapter({
          id: " ",
          modelId: "model-test",
          generate: vi.fn(),
        }),
      ).toThrow(TypeError);
    });

    it("refuzon modelId bosh", () => {
      expect(() =>
        createModelAdapter({
          id: "adapter-test",
          modelId: " ",
          generate: vi.fn(),
        }),
      ).toThrow(TypeError);
    });

    it("refuzon lloj adapter-i të pambështetur", () => {
      expect(() =>
        createModelAdapter({
          id: "adapter-test",
          modelId: "model-test",
          type: "unsupported",
          generate: vi.fn(),
        }),
      ).toThrow(TypeError);
    });

    it("refuzon adapter pa generate()", () => {
      expect(() =>
        createModelAdapter({
          id: "adapter-test",
          modelId: "model-test",
        }),
      ).toThrow(TypeError);
    });

    it("refuzon metoda opsionale që nuk janë funksione", () => {
      expect(() =>
        createModelAdapter({
          id: "adapter-test",
          modelId: "model-test",
          generate: vi.fn(),
          initialize: true,
        }),
      ).toThrow(TypeError);

      expect(() =>
        createModelAdapter({
          id: "adapter-test",
          modelId: "model-test",
          generate: vi.fn(),
          close: true,
        }),
      ).toThrow(TypeError);

      expect(() =>
        createModelAdapter({
          id: "adapter-test",
          modelId: "model-test",
          generate: vi.fn(),
          getStatus: true,
        }),
      ).toThrow(TypeError);
    });

    it("normalizon identifikuesit me hapësira", () => {
      const adapter = createModelAdapter({
        id: " adapter-one ",
        modelId: " model-one ",
        generate: vi.fn(),
      });

      expect(adapter.id).toBe("adapter-one");
      expect(adapter.modelId).toBe("model-one");
    });

    it("përdor initialize standard kur metoda mungon", async () => {
      const adapter = createAdapter({
        initialize: undefined,
      });

      const result = await adapter.initialize();

      expect(result).toMatchObject({
        success: true,
        initialized: true,
        adapterId: "adapter-test",
      });
    });

    it("përdor close standard kur metoda mungon", async () => {
      const adapter = createAdapter({
        close: undefined,
      });

      const result = await adapter.close();

      expect(result).toMatchObject({
        success: true,
        closed: true,
        adapterId: "adapter-test",
      });
    });

    it("refuzon kërkesë gjenerimi që nuk është objekt", async () => {
      const adapter = createAdapter();

      await expect(adapter.generate(null)).rejects.toThrow(
        TypeError,
      );

      await expect(adapter.generate([])).rejects.toThrow(
        TypeError,
      );

      await expect(adapter.generate("invalid")).rejects.toThrow(
        TypeError,
      );
    });

    it("delegon gjenerimin te implementimi origjinal", async () => {
      const generate = vi.fn(async () => ({
        text: "Adapter response",
      }));

      const adapter = createAdapter({ generate });

      const request = {
        prompt: "Test prompt",
        language: "sq",
      };

      const result = await adapter.generate(request);

      expect(generate).toHaveBeenCalledOnce();
      expect(generate).toHaveBeenCalledWith(request);
      expect(result.text).toBe("Adapter response");
    });

    it("përfshin metadata standarde në status", async () => {
      const adapter = createAdapter();

      const status = await adapter.getStatus();

      expect(status).toMatchObject({
        adapterId: "adapter-test",
        adapterType: MODEL_ADAPTER_TYPES.LOCAL,
        modelId: "model-test",
        adapterVersion: MODEL_ADAPTER_VERSION,
        available: true,
      });
    });

    it("ruan metadata shtesë në statusin e personalizuar", async () => {
      const adapter = createAdapter({
        getStatus: vi.fn(async () => ({
          available: false,
          loaded: false,
          customField: "test",
        })),
      });

      const status = await adapter.getStatus();

      expect(status).toMatchObject({
        available: false,
        loaded: false,
        customField: "test",
        adapterId: "adapter-test",
        adapterType: MODEL_ADAPTER_TYPES.LOCAL,
        modelId: "model-test",
        adapterVersion: MODEL_ADAPTER_VERSION,
      });
    });

    it("refuzon status të pavlefshëm nga implementimi", async () => {
      const adapter = createAdapter({
        getStatus: vi.fn(async () => null),
      });

      await expect(adapter.getStatus()).rejects.toThrow(
        TypeError,
      );
    });
  });

  describe("Model Registry", () => {
    it("krijon registry bosh", () => {
      const registry = createRegistry();

      expect(registry.getSize()).toBe(0);
      expect(registry.list()).toEqual([]);
      expect(registry.getStatus()).toMatchObject({
        version: MODEL_REGISTRY_VERSION,
        size: 0,
        modelIds: [],
      });
    });

    it("refuzon konfigurim të pavlefshëm", () => {
      expect(() => createModelRegistry(null)).toThrow(TypeError);
      expect(() => createModelRegistry([])).toThrow(TypeError);
      expect(() => createModelRegistry("invalid")).toThrow(TypeError);
    });

    it("regjistron adapter të vlefshëm", () => {
      const registry = createRegistry();
      const adapter = createAdapter();

      const registered = registry.register(adapter);

      expect(registered).toBe(adapter);
      expect(registry.get(adapter.id)).toBe(adapter);
      expect(registry.has(adapter.id)).toBe(true);
      expect(registry.getSize()).toBe(1);
    });

    it("regjistron adapter-at fillestarë", () => {
      const first = createAdapter({
        id: "adapter-one",
      });

      const second = createAdapter({
        id: "adapter-two",
      });

      const registry = createRegistry([first, second]);

      expect(registry.getSize()).toBe(2);
      expect(registry.get("adapter-one")).toBe(first);
      expect(registry.get("adapter-two")).toBe(second);
    });

    it("refuzon adapter të pavlefshëm", () => {
      const registry = createRegistry();

      expect(() => registry.register(null)).toThrow(TypeError);
      expect(() => registry.register([])).toThrow(TypeError);
      expect(() => registry.register("invalid")).toThrow(TypeError);
      expect(() => registry.register({})).toThrow(TypeError);
    });

    it("refuzon adapter pa generate()", () => {
      const registry = createRegistry();

      expect(() =>
        registry.register({
          id: "invalid-adapter",
        }),
      ).toThrow(TypeError);
    });

    it("refuzon ID të dyfishta", () => {
      const registry = createRegistry();

      registry.register(createAdapter());

      expect(() =>
        registry.register(createAdapter()),
      ).toThrow(
        expect.objectContaining({
          code: MODEL_REGISTRY_ERRORS.DUPLICATE_ID,
        }),
      );

      expect(registry.getSize()).toBe(1);
    });

    it("normalizon ID gjatë kërkimit", () => {
      const registry = createRegistry();
      const adapter = createAdapter();

      registry.register(adapter);

      expect(registry.get(" adapter-test ")).toBe(adapter);
      expect(registry.has(" adapter-test ")).toBe(true);
    });

    it("kthen null për adapter që nuk ekziston", () => {
      const registry = createRegistry();

      expect(registry.get("missing-adapter")).toBeNull();
      expect(registry.has("missing-adapter")).toBe(false);
    });

    it("refuzon identifikues të pavlefshëm", () => {
      const registry = createRegistry();

      expect(() => registry.get(" ")).toThrow(TypeError);
      expect(() => registry.has(null)).toThrow(TypeError);
      expect(() => registry.unregister(" ")).toThrow(TypeError);
    });

    it("liston adapter-at e regjistruar", () => {
      const first = createAdapter({ id: "adapter-one" });
      const second = createAdapter({ id: "adapter-two" });

      const registry = createRegistry([first, second]);

      expect(registry.list()).toEqual([first, second]);
    });

    it("liston metadata pa ekspozuar objektet e plota", () => {
      const adapter = createAdapter();

      const registry = createRegistry([adapter]);
      const metadata = registry.listMetadata();

      expect(metadata).toEqual([
        {
          id: "adapter-test",
          type: MODEL_ADAPTER_TYPES.LOCAL,
          modelId: "model-test",
          version: MODEL_ADAPTER_VERSION,
        },
      ]);
    });

    it("heq adapter-in e regjistruar", () => {
      const adapter = createAdapter();
      const registry = createRegistry([adapter]);

      expect(registry.unregister(adapter.id)).toBe(true);
      expect(registry.has(adapter.id)).toBe(false);
      expect(registry.getSize()).toBe(0);
    });

    it("kthen false kur heq adapter që nuk ekziston", () => {
      const registry = createRegistry();

      expect(registry.unregister("missing")).toBe(false);
    });

    it("pastron të gjithë adapter-at", () => {
      const registry = createRegistry([
        createAdapter({ id: "adapter-one" }),
        createAdapter({ id: "adapter-two" }),
        createAdapter({ id: "adapter-three" }),
      ]);

      expect(registry.clear()).toBe(3);
      expect(registry.getSize()).toBe(0);
      expect(registry.list()).toEqual([]);
    });

    it("ruan konsistencën e statusit pas regjistrimit dhe heqjes", () => {
      const registry = createRegistry();

      registry.register(createAdapter({ id: "adapter-one" }));
      registry.register(createAdapter({ id: "adapter-two" }));

      expect(registry.getStatus()).toMatchObject({
        version: MODEL_REGISTRY_VERSION,
        size: 2,
        modelIds: ["adapter-one", "adapter-two"],
      });

      registry.unregister("adapter-one");

      expect(registry.getStatus()).toMatchObject({
        size: 1,
        modelIds: ["adapter-two"],
      });
    });
  });

  describe("Model Selector", () => {
    it("krijon selector me registry të vlefshëm", () => {
      const registry = createRegistry();
      const selector = createModelSelector({ registry });

      expect(selector.getStatus()).toMatchObject({
        version: MODEL_SELECTOR_VERSION,
        defaultModelId: null,
        registeredModels: 0,
      });
    });

    it("refuzon konfigurim të pavlefshëm", () => {
      expect(() => createModelSelector(null)).toThrow(TypeError);
      expect(() => createModelSelector([])).toThrow(TypeError);
      expect(() => createModelSelector("invalid")).toThrow(TypeError);
    });

    it("refuzon registry të pavlefshëm", () => {
      expect(() =>
        createModelSelector({ registry: null }),
      ).toThrow(
        expect.objectContaining({
          code: MODEL_SELECTION_ERRORS.REGISTRY_INVALID,
        }),
      );
    });

    it("përzgjedh modelin e vetëm të regjistruar", () => {
      const adapter = createAdapter();
      const registry = createRegistry([adapter]);

      const selector = createModelSelector({ registry });

      expect(selector.select()).toBe(adapter);
    });

    it("përzgjedh modelin e parazgjedhur kur është kompatibil", () => {
      const first = createAdapter({
        id: "adapter-one",
      });

      const second = createAdapter({
        id: "adapter-two",
      });

      const registry = createRegistry([first, second]);

      const selector = createModelSelector({
        registry,
        defaultModelId: "adapter-two",
      });

      expect(selector.select()).toBe(second);
      expect(selector.getDefaultModel()).toBe(second);
    });

    it("përzgjedh modelin e kërkuar sipas ID-së", () => {
      const first = createAdapter({
        id: "adapter-one",
      });

      const second = createAdapter({
        id: "adapter-two",
      });

      const registry = createRegistry([first, second]);
      const selector = createModelSelector({ registry });

      expect(
        selector.select({ modelId: "adapter-two" }),
      ).toBe(second);
    });

    it("refuzon model ID që nuk ekziston", () => {
      const registry = createRegistry([
        createAdapter(),
      ]);

      const selector = createModelSelector({ registry });

      expect(() =>
        selector.select({ modelId: "missing-model" }),
      ).toThrow(
        expect.objectContaining({
          code: MODEL_SELECTION_ERRORS.MODEL_NOT_FOUND,
        }),
      );
    });

    it("refuzon kërkesë për përzgjedhje që nuk është objekt", () => {
      const registry = createRegistry([
        createAdapter(),
      ]);

      const selector = createModelSelector({ registry });

      expect(() => selector.select(null)).toThrow(
        expect.objectContaining({
          code: MODEL_SELECTION_ERRORS.INVALID_REQUEST,
        }),
      );
    });

    it("refuzon model që nuk është i disponueshëm", () => {
      const adapter = {
        id: "unavailable-model",
        available: false,
        generate: vi.fn(),
      };

      const registry = createRegistry([adapter]);
      const selector = createModelSelector({ registry });

      expect(() =>
        selector.select({ modelId: "unavailable-model" }),
      ).toThrow(
        expect.objectContaining({
          code: MODEL_SELECTION_ERRORS.NO_COMPATIBLE_MODEL,
        }),
      );
    });

    it("filtron modelet sipas gjuhës", () => {
      const albanianAdapter = {
        id: "albanian-model",
        languages: ["sq"],
        generate: vi.fn(),
      };

      const englishAdapter = {
        id: "english-model",
        languages: ["en"],
        generate: vi.fn(),
      };

      const registry = createRegistry([
        albanianAdapter,
        englishAdapter,
      ]);

      const selector = createModelSelector({ registry });

      expect(
        selector.select({ language: "en" }),
      ).toBe(englishAdapter);

      expect(
        selector.select({ language: "sq" }),
      ).toBe(albanianAdapter);
    });

    it("mbështet wildcard për gjuhët", () => {
      const adapter = {
        id: "universal-model",
        languages: ["*"],
        generate: vi.fn(),
      };

      const registry = createRegistry([adapter]);
      const selector = createModelSelector({ registry });

      expect(
        selector.select({ language: "fr" }),
      ).toBe(adapter);
    });

    it("filtron modelet sipas aftësive", () => {
      const basicAdapter = {
        id: "basic-model",
        capabilities: ["chat"],
        generate: vi.fn(),
      };

      const advancedAdapter = {
        id: "advanced-model",
        capabilities: ["chat", "reasoning", "code"],
        generate: vi.fn(),
      };

      const registry = createRegistry([
        basicAdapter,
        advancedAdapter,
      ]);

      const selector = createModelSelector({ registry });

      expect(
        selector.select({
          requiredCapabilities: ["reasoning", "code"],
        }),
      ).toBe(advancedAdapter);
    });

    it("refuzon kur asnjë model nuk i plotëson kërkesat", () => {
      const adapter = {
        id: "basic-model",
        capabilities: ["chat"],
        generate: vi.fn(),
      };

      const registry = createRegistry([adapter]);
      const selector = createModelSelector({ registry });

      expect(() =>
        selector.select({
          requiredCapabilities: ["reasoning"],
        }),
      ).toThrow(
        expect.objectContaining({
          code: MODEL_SELECTION_ERRORS.NO_COMPATIBLE_MODEL,
        }),
      );
    });

    it("normalizon gjuhët dhe aftësitë", () => {
      const adapter = {
        id: "normalized-model",
        languages: [" SQ "],
        capabilities: [" Chat ", "REASONING"],
        generate: vi.fn(),
      };

      const registry = createRegistry([adapter]);
      const selector = createModelSelector({ registry });

      expect(
        selector.select({
          language: "sq",
          requiredCapabilities: ["chat", "reasoning"],
        }),
      ).toBe(adapter);
    });

    it("liston vetëm modelet kompatibile", () => {
      const first = {
        id: "model-sq",
        languages: ["sq"],
        generate: vi.fn(),
      };

      const second = {
        id: "model-en",
        languages: ["en"],
        generate: vi.fn(),
      };

      const registry = createRegistry([first, second]);
      const selector = createModelSelector({ registry });

      expect(
        selector.listCompatible({ language: "sq" }),
      ).toEqual([first]);
    });

    it("canSelect kthen true për kërkesë kompatibile", () => {
      const registry = createRegistry([
        createAdapter(),
      ]);

      const selector = createModelSelector({ registry });

      expect(selector.canSelect()).toBe(true);
    });

    it("canSelect kthen false për kërkesë të pavlefshme", () => {
      const registry = createRegistry([
        createAdapter(),
      ]);

      const selector = createModelSelector({ registry });

      expect(
        selector.canSelect({ modelId: "missing-model" }),
      ).toBe(false);
    });

    it("përzgjedh adapter-in e parë kompatibil kur default nuk është kompatibil", () => {
      const first = {
        id: "first-model",
        languages: ["en"],
        generate: vi.fn(),
      };

      const second = {
        id: "second-model",
        languages: ["sq"],
        generate: vi.fn(),
      };

      const registry = createRegistry([first, second]);

      const selector = createModelSelector({
        registry,
        defaultModelId: "first-model",
      });

      expect(
        selector.select({ language: "sq" }),
      ).toBe(second);
    });
  });

  describe("Runtime & Adapter Integration", () => {
    it("lidh adapter-in me runtime", async () => {
      const adapter = createAdapter();

      const runtime = createModelRuntime({ adapter });

      const status = await runtime.initialize();

      expect(status.state).toBe(MODEL_RUNTIME_STATES.READY);
      expect(status.initialized).toBe(true);
      expect(status.adapterId).toBe("adapter-test");
    });

    it("përdor modelId të adapter-it", async () => {
      const adapter = createAdapter({
        id: "local-adapter",
        modelId: "local-model",
      });

      const runtime = createModelRuntime({ adapter });

      const status = await runtime.initialize();

      expect(status.modelId).toBe("local-model");
      expect(status.adapterId).toBe("local-adapter");
    });

    it("delegon gjenerimin nga runtime te adapter-i", async () => {
      const generate = vi.fn(async ({ prompt }) => ({
        text: `Adapter response: ${prompt}`,
        finishReason: "stop",
      }));

      const adapter = createAdapter({ generate });
      const runtime = createModelRuntime({ adapter });

      await runtime.initialize();

      const response = await runtime.generate({
        prompt: "Integration test",
        language: "sq",
      });

      expect(response.success).toBe(true);
      expect(response.text).toBe(
        "Adapter response: Integration test",
      );

      expect(generate).toHaveBeenCalledOnce();
      expect(generate.mock.calls[0][0]).toMatchObject({
        prompt: "Integration test",
        language: "sq",
      });
    });

    it("delegon mbylljen nga runtime te adapter-i", async () => {
      const close = vi.fn(async () => ({
        success: true,
        closed: true,
      }));

      const adapter = createAdapter({ close });
      const runtime = createModelRuntime({ adapter });

      await runtime.initialize();
      const status = await runtime.close();

      expect(close).toHaveBeenCalledOnce();
      expect(status.state).toBe(MODEL_RUNTIME_STATES.CLOSED);
    });

    it("ruan izolimin e gabimeve të adapter-it", async () => {
      const adapter = createAdapter({
        generate: vi.fn(async () => {
          throw new Error("Adapter inference failure");
        }),
      });

      const runtime = createModelRuntime({ adapter });

      await runtime.initialize();

      await expect(
        runtime.generate({ prompt: "Failing request" }),
      ).rejects.toMatchObject({
        message: "Adapter inference failure",
      });

      expect(runtime.getStatus().activeGenerations).toBe(0);
    });

    it("ruan metadata e adapter-it gjatë ciklit të runtime-it", async () => {
      const adapter = createAdapter({
        id: "metadata-adapter",
        modelId: "metadata-model",
      });

      const runtime = createModelRuntime({ adapter });

      const initialStatus = await runtime.initialize();

      expect(initialStatus).toMatchObject({
        adapterId: "metadata-adapter",
        modelId: "metadata-model",
        state: MODEL_RUNTIME_STATES.READY,
      });

      const response = await runtime.generate({
        prompt: "Metadata test",
      });

      expect(response).toMatchObject({
        success: true,
        modelId: "metadata-model",
      });

      const finalStatus = await runtime.close();

      expect(finalStatus).toMatchObject({
        adapterId: "metadata-adapter",
        modelId: "metadata-model",
        state: MODEL_RUNTIME_STATES.CLOSED,
      });
    });
  });

  describe("Registry & Selector Integration", () => {
    it("përzgjedh adapter të regjistruar në registry", () => {
      const first = createAdapter({
        id: "local-one",
        modelId: "model-one",
      });

      const second = createAdapter({
        id: "local-two",
        modelId: "model-two",
      });

      const registry = createRegistry([first, second]);

      const selector = createModelSelector({
        registry,
        defaultModelId: "local-two",
      });

      expect(selector.select()).toBe(second);
      expect(registry.has("local-one")).toBe(true);
      expect(registry.has("local-two")).toBe(true);
    });

    it("përditëson përzgjedhjen pas heqjes së adapter-it", () => {
      const first = createAdapter({
        id: "local-one",
      });

      const second = createAdapter({
        id: "local-two",
      });

      const registry = createRegistry([first, second]);
      const selector = createModelSelector({ registry });

      expect(selector.select()).toBe(first);

      registry.unregister("local-one");

      expect(selector.select()).toBe(second);
      expect(selector.listCompatible()).toEqual([second]);
    });

    it("refuzon përzgjedhjen kur registry pastrohet", () => {
      const registry = createRegistry([
        createAdapter(),
      ]);

      const selector = createModelSelector({ registry });

      registry.clear();

      expect(() => selector.select()).toThrow(
        expect.objectContaining({
          code: MODEL_SELECTION_ERRORS.NO_COMPATIBLE_MODEL,
        }),
      );

      expect(selector.canSelect()).toBe(false);
    });

    it("ruan konsistencën e metadata pas regjistrimeve të shumta", () => {
      const adapters = Array.from(
        { length: 20 },
        (_, index) =>
          createAdapter({
            id: `adapter-${index}`,
            modelId: `model-${index}`,
          }),
      );

      const registry = createRegistry(adapters);
      const selector = createModelSelector({ registry });

      expect(registry.getSize()).toBe(20);
      expect(selector.getStatus().registeredModels).toBe(20);
      expect(selector.listCompatible()).toHaveLength(20);
    });
  });
});
