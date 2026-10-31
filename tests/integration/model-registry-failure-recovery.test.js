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

function createAdapter(overrides = {}) {
  return createModelAdapter({
    id: "adapter-test",
    type: MODEL_ADAPTER_TYPES.LOCAL,
    modelId: "model-test",
    languages: ["sq", "en"],
    capabilities: ["chat"],
    generate: vi.fn(async ({ prompt }) => ({
      text: `Response: ${prompt}`,
      finishReason: "stop",
    })),
    ...overrides,
  });
}

function createRegistry(adapters = []) {
  return createModelRegistry({ adapters });
}

describe("XSUS AI Core — Registry Failure Recovery", () => {
  describe("Rikuperimi pas dështimit të regjistrimit", () => {
    it("ruan adapter-in origjinal pas një ID-je të dyfishtë", () => {
      const original = createAdapter({
        id: "shared-adapter",
        modelId: "original-model",
      });

      const duplicate = createAdapter({
        id: "shared-adapter",
        modelId: "duplicate-model",
      });

      const registry = createRegistry([original]);

      expect(() => registry.register(duplicate)).toThrow(
        expect.objectContaining({
          code: MODEL_REGISTRY_ERRORS.DUPLICATE_ID,
        }),
      );

      expect(registry.get("shared-adapter")).toBe(original);
      expect(registry.getSize()).toBe(1);
      expect(registry.list()).toEqual([original]);
    });

    it("lejon regjistrime të vlefshme pas dështimit të mëparshëm", () => {
      const original = createAdapter({
        id: "existing-adapter",
      });

      const duplicate = createAdapter({
        id: "existing-adapter",
        modelId: "duplicate-model",
      });

      const next = createAdapter({
        id: "new-adapter",
        modelId: "new-model",
      });

      const registry = createRegistry([original]);

      expect(() => registry.register(duplicate)).toThrow();

      expect(registry.register(next)).toBe(next);
      expect(registry.get("existing-adapter")).toBe(original);
      expect(registry.get("new-adapter")).toBe(next);
      expect(registry.getSize()).toBe(2);
    });

    it("ruan integritetin pas dështimeve të përsëritura", () => {
      const original = createAdapter({
        id: "stable-adapter",
      });

      const registry = createRegistry([original]);

      for (let index = 0; index < 5; index += 1) {
        const duplicate = createAdapter({
          id: "stable-adapter",
          modelId: `duplicate-${index}`,
        });

        expect(() => registry.register(duplicate)).toThrow();
        expect(registry.get("stable-adapter")).toBe(original);
        expect(registry.getSize()).toBe(1);
      }

      const replacement = createAdapter({
        id: "replacement-adapter",
      });

      registry.register(replacement);

      expect(registry.getSize()).toBe(2);
      expect(registry.list()).toEqual([original, replacement]);
    });
  });

  describe("Rikuperimi i Model Selector", () => {
    it("zgjedh modelin alternativ pasi hiqet modeli default", () => {
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

      expect(registry.unregister("preferred-adapter")).toBe(true);

      expect(selector.getDefaultModel()).toBeNull();
      expect(selector.select()).toBe(fallback);
      expect(selector.listCompatible()).toEqual([fallback]);
    });

    it("rikuperon përzgjedhjen kur shtohet një model pas pastrimit", () => {
      const first = createAdapter({
        id: "first-adapter",
      });

      const registry = createRegistry([first]);

      const selector = createModelSelector({ registry });

      expect(selector.select()).toBe(first);

      registry.clear();

      expect(selector.canSelect()).toBe(false);

      expect(() => selector.select()).toThrow(
        expect.objectContaining({
          code: MODEL_SELECTION_ERRORS.NO_COMPATIBLE_MODEL,
        }),
      );

      const recovered = createAdapter({
        id: "recovered-adapter",
      });

      registry.register(recovered);

      expect(selector.canSelect()).toBe(true);
      expect(selector.select()).toBe(recovered);
      expect(selector.listCompatible()).toEqual([recovered]);
    });

    it("nuk zgjedh adapter të hequr pas ndryshimeve të përsëritura", () => {
      const first = createAdapter({
        id: "first-adapter",
      });

      const second = createAdapter({
        id: "second-adapter",
      });

      const third = createAdapter({
        id: "third-adapter",
      });

      const registry = createRegistry([first, second]);
      const selector = createModelSelector({ registry });

      expect(selector.select()).toBe(first);

      registry.unregister("first-adapter");

      expect(selector.select()).toBe(second);

      registry.unregister("second-adapter");

      expect(selector.canSelect()).toBe(false);

      expect(() => selector.select()).toThrow(
        expect.objectContaining({
          code: MODEL_SELECTION_ERRORS.NO_COMPATIBLE_MODEL,
        }),
      );

      registry.register(third);

      expect(selector.select()).toBe(third);
      expect(selector.listCompatible()).toEqual([third]);
    });

    it("ruan filtrimin sipas gjuhës pas ndryshimeve në Registry", () => {
      const english = createAdapter({
        id: "english-adapter",
        languages: ["en"],
      });

      const registry = createRegistry([english]);

      const selector = createModelSelector({ registry });

      expect(
        selector.listCompatible({ language: "sq" }),
      ).toHaveLength(0);

      const albanian = createAdapter({
        id: "albanian-adapter",
        languages: ["sq"],
      });

      registry.register(albanian);

      expect(
        selector.listCompatible({ language: "sq" }),
      ).toEqual([albanian]);

      registry.unregister("albanian-adapter");

      expect(
        selector.listCompatible({ language: "sq" }),
      ).toHaveLength(0);
    });
  });

  describe("Konsistenca pas operacioneve të përsëritura", () => {
    it("ruan të dhënat e mbetura pas heqjes dhe regjistrimit të adapter-ave", () => {
      const adapters = Array.from(
        { length: 10 },
        (_, index) =>
          createAdapter({
            id: `adapter-${index}`,
            modelId: `model-${index}`,
          }),
      );

      const registry = createRegistry(adapters);

      for (let index = 0; index < 10; index += 2) {
        expect(
          registry.unregister(`adapter-${index}`),
        ).toBe(true);
      }

      expect(registry.getSize()).toBe(5);

      const newAdapters = Array.from(
        { length: 5 },
        (_, index) =>
          createAdapter({
            id: `recovered-${index}`,
            modelId: `recovered-model-${index}`,
          }),
      );

      newAdapters.forEach((adapter) => {
        registry.register(adapter);
      });

      expect(registry.getSize()).toBe(10);

      for (let index = 1; index < 10; index += 2) {
        expect(registry.has(`adapter-${index}`)).toBe(true);
      }

      for (let index = 0; index < 10; index += 2) {
        expect(registry.has(`adapter-${index}`)).toBe(false);
      }

      for (let index = 0; index < 5; index += 1) {
        expect(registry.has(`recovered-${index}`)).toBe(true);
      }
    });

    it("ruan rendin dhe unikësinë e ID-ve pas rikuperimit", () => {
      const registry = createRegistry();

      const firstBatch = Array.from(
        { length: 20 },
        (_, index) =>
          createAdapter({
            id: `first-${index}`,
          }),
      );

      firstBatch.forEach((adapter) => {
        registry.register(adapter);
      });

      registry.clear();

      const secondBatch = Array.from(
        { length: 20 },
        (_, index) =>
          createAdapter({
            id: `second-${index}`,
          }),
      );

      secondBatch.forEach((adapter) => {
        registry.register(adapter);
      });

      const ids = registry.list().map((adapter) => adapter.id);

      expect(ids).toEqual(
        secondBatch.map((adapter) => adapter.id),
      );

      expect(new Set(ids).size).toBe(20);
      expect(registry.getSize()).toBe(20);
    });

    it("mbetet konsistent pas shumë cikleve clear dhe register", () => {
      const registry = createRegistry();

      for (let cycle = 0; cycle < 10; cycle += 1) {
        const batch = Array.from(
          { length: 10 },
          (_, index) =>
            createAdapter({
              id: `cycle-${cycle}-adapter-${index}`,
            }),
        );

        batch.forEach((adapter) => {
          registry.register(adapter);
        });

        expect(registry.getSize()).toBe(10);

        expect(registry.clear()).toBe(10);
        expect(registry.getSize()).toBe(0);
        expect(registry.list()).toEqual([]);
      }
    });
  });
});
