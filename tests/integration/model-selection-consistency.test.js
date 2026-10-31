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
  MODEL_SELECTION_ERRORS,
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

function createRegistry(adapters = []) {
  return createModelRegistry({ adapters });
}

function createSelectionAdapter({
  id,
  languages = [],
  capabilities = [],
  available = true,
}) {
  return {
    id,
    modelId: `model-${id}`,
    languages,
    capabilities,
    available,
    generate: vi.fn(async () => ({
      text: `Response from ${id}`,
      finishReason: "stop",
    })),
  };
}

describe("XSUS AI Core — Model Selection Consistency", () => {
  describe("Përparësia e modelit default", () => {
    it("preferon modelin default kur është i disponueshëm", () => {
      const first = createAdapter("first");
      const preferred = createAdapter("preferred");
      const third = createAdapter("third");

      const registry = createRegistry([
        first,
        preferred,
        third,
      ]);

      const selector = createModelSelector({
        registry,
        defaultModelId: "preferred",
      });

      expect(selector.select()).toBe(preferred);
    });

    it("përdor alternativën kur modeli default nuk ekziston", () => {
      const first = createAdapter("first");
      const second = createAdapter("second");

      const registry = createRegistry([first, second]);

      const selector = createModelSelector({
        registry,
        defaultModelId: "missing-model",
      });

      expect(selector.select()).toBe(first);
    });

    it("preferon alternativën e parë të përshtatshme kur default hiqet", () => {
      const preferred = createAdapter("preferred");
      const fallback = createAdapter("fallback");

      const registry = createRegistry([
        preferred,
        fallback,
      ]);

      const selector = createModelSelector({
        registry,
        defaultModelId: "preferred",
      });

      expect(selector.select()).toBe(preferred);

      registry.unregister("preferred");

      expect(selector.select()).toBe(fallback);
      expect(selector.getDefaultModel()).toBeNull();
    });
  });

  describe("Përzgjedhja sipas gjuhës dhe kapaciteteve", () => {
    it("zgjedh vetëm modelet që mbështesin gjuhën e kërkuar", () => {
      const english = createSelectionAdapter({
        id: "english",
        languages: ["en"],
      });

      const albanian = createSelectionAdapter({
        id: "albanian",
        languages: ["sq"],
      });

      const registry = createRegistry([
        english,
        albanian,
      ]);

      const selector = createModelSelector({ registry });

      expect(
        selector.listCompatible({ language: "sq" }),
      ).toEqual([albanian]);

      expect(
        selector.listCompatible({ language: "en" }),
      ).toEqual([english]);
    });

    it("zgjedh modelin që mbështet të gjitha kapacitetet e kërkuara", () => {
      const chatOnly = createSelectionAdapter({
        id: "chat-only",
        capabilities: ["chat"],
      });

      const chatTools = createSelectionAdapter({
        id: "chat-tools",
        capabilities: ["chat", "tools"],
      });

      const registry = createRegistry([
        chatOnly,
        chatTools,
      ]);

      const selector = createModelSelector({ registry });

      expect(
        selector.listCompatible({
          requiredCapabilities: ["chat", "tools"],
        }),
      ).toEqual([chatTools]);

      expect(
        selector.select({
          requiredCapabilities: ["chat", "tools"],
        }),
      ).toBe(chatTools);
    });

    it("kthen listë bosh kur nuk ekziston model i përshtatshëm", () => {
      const adapter = createSelectionAdapter({
        id: "basic",
        languages: ["en"],
        capabilities: ["chat"],
      });

      const registry = createRegistry([adapter]);
      const selector = createModelSelector({ registry });

      expect(
        selector.listCompatible({
          language: "sq",
          requiredCapabilities: ["tools"],
        }),
      ).toHaveLength(0);

      expect(
        selector.canSelect({
          language: "sq",
          requiredCapabilities: ["tools"],
        }),
      ).toBe(false);
    });

    it("mbështet wildcard të gjuhëve kur adapter-i e deklaron", () => {
      const universal = createSelectionAdapter({
        id: "universal",
        languages: ["*"],
        capabilities: ["chat"],
      });

      const registry = createRegistry([universal]);
      const selector = createModelSelector({ registry });

      expect(
        selector.listCompatible({ language: "sq" }),
      ).toEqual([universal]);

      expect(
        selector.listCompatible({ language: "fr" }),
      ).toEqual([universal]);
    });
  });

  describe("Ndryshimet dinamike të Registry", () => {
    it("përditëson përzgjedhjen pas regjistrimit të një modeli të ri", () => {
      const first = createAdapter("first");
      const registry = createRegistry([first]);
      const selector = createModelSelector({ registry });

      expect(selector.select()).toBe(first);

      const second = createAdapter("second");

      registry.register(second);

      expect(selector.listCompatible()).toEqual([
        first,
        second,
      ]);

      expect(selector.select()).toBe(first);
    });

    it("përzgjedh modelin e mbetur pas heqjes së të parit", () => {
      const first = createAdapter("first");
      const second = createAdapter("second");

      const registry = createRegistry([
        first,
        second,
      ]);

      const selector = createModelSelector({ registry });

      registry.unregister("first");

      expect(selector.select()).toBe(second);
      expect(selector.listCompatible()).toEqual([second]);
    });

    it("rikuperon përzgjedhjen pas pastrimit dhe regjistrimit të ri", () => {
      const initial = createAdapter("initial");
      const registry = createRegistry([initial]);
      const selector = createModelSelector({ registry });

      expect(selector.select()).toBe(initial);

      registry.clear();

      expect(selector.canSelect()).toBe(false);

      expect(() => selector.select()).toThrow(
        expect.objectContaining({
          code: MODEL_SELECTION_ERRORS.NO_COMPATIBLE_MODEL,
        }),
      );

      const recovered = createAdapter("recovered");

      registry.register(recovered);

      expect(selector.canSelect()).toBe(true);
      expect(selector.select()).toBe(recovered);
    });
  });

  describe("Disponueshmëria e modeleve", () => {
    it("përjashton modelet që deklarohen si të padisponueshme", () => {
      const unavailable = createSelectionAdapter({
        id: "unavailable",
        available: false,
      });

      const available = createSelectionAdapter({
        id: "available",
        available: true,
      });

      const registry = createRegistry([
        unavailable,
        available,
      ]);

      const selector = createModelSelector({ registry });

      expect(selector.listCompatible()).toEqual([available]);
      expect(selector.select()).toBe(available);
    });

    it("rikthen modelin në listën e përputhshme kur bëhet i disponueshëm", () => {
      const adapter = createSelectionAdapter({
        id: "dynamic",
        available: false,
      });

      const registry = createRegistry([adapter]);
      const selector = createModelSelector({ registry });

      expect(selector.canSelect()).toBe(false);

      adapter.available = true;

      expect(selector.canSelect()).toBe(true);
      expect(selector.select()).toBe(adapter);
    });
  });

  describe("Konsistenca e përzgjedhjes", () => {
    it("nuk kthen adapter që nuk ekziston më në Registry", () => {
      const first = createAdapter("first");
      const second = createAdapter("second");

      const registry = createRegistry([
        first,
        second,
      ]);

      const selector = createModelSelector({ registry });

      registry.unregister("first");

      const selected = selector.select();

      expect(selected).toBe(second);
      expect(registry.has(selected.id)).toBe(true);
    });

    it("ruan përzgjedhjen pas 100 ndryshimeve në Registry", () => {
      const registry = createRegistry();
      const selector = createModelSelector({ registry });

      for (let index = 0; index < 100; index += 1) {
        const adapter = createAdapter(`dynamic-${index}`);

        registry.register(adapter);

        expect(selector.canSelect()).toBe(true);
        expect(selector.select()).toBe(adapter);
        expect(registry.has(selector.select().id)).toBe(true);

        registry.unregister(adapter.id);

        expect(selector.canSelect()).toBe(false);
        expect(selector.listCompatible()).toHaveLength(0);
      }

      expect(registry.getSize()).toBe(0);
    });
  });
});
