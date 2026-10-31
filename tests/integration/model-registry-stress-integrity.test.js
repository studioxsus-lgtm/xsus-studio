import { describe, it, expect, vi } from "vitest";

import {
  createModelAdapter,
  MODEL_ADAPTER_TYPES,
} from "../../src/runtime/model-adapter.js";

import {
  createModelRegistry,
} from "../../src/runtime/model-registry.js";

import {
  createModelSelector,
} from "../../src/runtime/model-selector.js";

function createAdapter(id, overrides = {}) {
  return createModelAdapter({
    id,
    type: MODEL_ADAPTER_TYPES.LOCAL,
    modelId: `model-${id}`,
    generate: vi.fn(async ({ prompt }) => ({
      text: `Response: ${prompt}`,
      finishReason: "stop",
    })),
    ...overrides,
  });
}

function createBatch(prefix, count) {
  return Array.from(
    { length: count },
    (_, index) => createAdapter(`${prefix}-${index}`),
  );
}

function createRegistry(adapters = []) {
  return createModelRegistry({ adapters });
}

describe("XSUS AI Core — Registry Stress Integrity", () => {
  describe("Regjistrimi masiv", () => {
    it("regjistron dhe ruan 500 adapter-a", () => {
      const registry = createRegistry();
      const adapters = createBatch("stress", 500);

      adapters.forEach((adapter) => {
        registry.register(adapter);
      });

      expect(registry.getSize()).toBe(500);
      expect(registry.list()).toHaveLength(500);

      adapters.forEach((adapter) => {
        expect(registry.has(adapter.id)).toBe(true);
        expect(registry.get(adapter.id)).toBe(adapter);
      });
    });

    it("ruan rendin dhe unikësinë e 500 ID-ve", () => {
      const registry = createRegistry();
      const adapters = createBatch("ordered", 500);

      adapters.forEach((adapter) => {
        registry.register(adapter);
      });

      const ids = registry.list().map((adapter) => adapter.id);

      expect(ids).toEqual(
        adapters.map((adapter) => adapter.id),
      );

      expect(new Set(ids).size).toBe(500);
    });

    it("refuzon ID-të e dyfishta pa dëmtuar Registry-n", () => {
      const registry = createRegistry();
      const adapters = createBatch("unique", 100);

      adapters.forEach((adapter) => {
        registry.register(adapter);
      });

      const original = registry.get("unique-50");

      for (let index = 0; index < 25; index += 1) {
        const duplicate = createAdapter("unique-50");

        expect(() => registry.register(duplicate)).toThrow();
        expect(registry.get("unique-50")).toBe(original);
        expect(registry.getSize()).toBe(100);
      }
    });
  });

  describe("Heqja dhe rikuperimi masiv", () => {
    it("heq 250 adapter-a dhe ruan 250 të tjerët", () => {
      const adapters = createBatch("remove", 500);
      const registry = createRegistry(adapters);

      for (let index = 0; index < 500; index += 2) {
        expect(
          registry.unregister(`remove-${index}`),
        ).toBe(true);
      }

      expect(registry.getSize()).toBe(250);

      for (let index = 0; index < 500; index += 2) {
        expect(registry.has(`remove-${index}`)).toBe(false);
      }

      for (let index = 1; index < 500; index += 2) {
        expect(registry.has(`remove-${index}`)).toBe(true);
      }
    });

    it("rikthen 500 adapter-a pas pastrimit të plotë", () => {
      const registry = createRegistry(createBatch("initial", 500));

      expect(registry.getSize()).toBe(500);
      expect(registry.clear()).toBe(500);
      expect(registry.getSize()).toBe(0);
      expect(registry.list()).toEqual([]);

      const recovered = createBatch("recovered", 500);

      recovered.forEach((adapter) => {
        registry.register(adapter);
      });

      expect(registry.getSize()).toBe(500);

      recovered.forEach((adapter) => {
        expect(registry.get(adapter.id)).toBe(adapter);
      });
    });

    it("ruan konsistencën gjatë 20 cikleve regjistrim dhe pastrim", () => {
      const registry = createRegistry();

      for (let cycle = 0; cycle < 20; cycle += 1) {
        const adapters = createBatch(`cycle-${cycle}`, 50);

        adapters.forEach((adapter) => {
          registry.register(adapter);
        });

        expect(registry.getSize()).toBe(50);

        expect(registry.clear()).toBe(50);
        expect(registry.getSize()).toBe(0);
        expect(registry.list()).toEqual([]);
      }
    });
  });

  describe("Model Selector nën ngarkesë", () => {
    it("përzgjedh modelin nga Registry me 500 adapter-a", () => {
      const adapters = createBatch("selection", 500);
      const registry = createRegistry(adapters);
      const selector = createModelSelector({ registry });

      expect(selector.canSelect()).toBe(true);
      expect(selector.select()).toBe(adapters[0]);

      expect(selector.listCompatible()).toHaveLength(500);
    });

    it("përzgjedh adapter-in alternativ pas heqjes së 100 të parëve", () => {
      const adapters = createBatch("fallback", 500);
      const registry = createRegistry(adapters);
      const selector = createModelSelector({ registry });

      for (let index = 0; index < 100; index += 1) {
        expect(
          registry.unregister(`fallback-${index}`),
        ).toBe(true);
      }

      expect(selector.canSelect()).toBe(true);
      expect(selector.select()).toBe(adapters[100]);
      expect(selector.listCompatible()).toHaveLength(400);
    });

    it("rikuperon përzgjedhjen pasi Registry zbrazet dhe mbushet përsëri", () => {
      const initial = createBatch("before", 100);
      const registry = createRegistry(initial);
      const selector = createModelSelector({ registry });

      expect(selector.select()).toBe(initial[0]);

      registry.clear();

      expect(selector.canSelect()).toBe(false);
      expect(selector.listCompatible()).toHaveLength(0);

      const recovered = createBatch("after", 200);

      recovered.forEach((adapter) => {
        registry.register(adapter);
      });

      expect(selector.canSelect()).toBe(true);
      expect(selector.select()).toBe(recovered[0]);
      expect(selector.listCompatible()).toHaveLength(200);
    });
  });

  describe("Konsistenca pas operacioneve intensive", () => {
    it("ruan integritetin pas 1000 regjistrimeve dhe 500 heqjeve", () => {
      const registry = createRegistry();
      const adapters = createBatch("large", 1000);

      adapters.forEach((adapter) => {
        registry.register(adapter);
      });

      expect(registry.getSize()).toBe(1000);

      for (let index = 0; index < 1000; index += 2) {
        registry.unregister(`large-${index}`);
      }

      expect(registry.getSize()).toBe(500);

      const remainingIds = registry
        .list()
        .map((adapter) => adapter.id);

      expect(remainingIds).toHaveLength(500);
      expect(new Set(remainingIds).size).toBe(500);

      remainingIds.forEach((id) => {
        expect(registry.has(id)).toBe(true);
      });
    });

    it("ruan gjendjen pas 100 operacioneve të regjistrimit dhe heqjes", () => {
      const registry = createRegistry();

      for (let index = 0; index < 100; index += 1) {
        const adapter = createAdapter(`temporary-${index}`);

        registry.register(adapter);

        expect(registry.has(adapter.id)).toBe(true);
        expect(registry.getSize()).toBe(1);

        expect(registry.unregister(adapter.id)).toBe(true);

        expect(registry.has(adapter.id)).toBe(false);
        expect(registry.getSize()).toBe(0);
      }

      expect(registry.list()).toEqual([]);
    });
  });
});
