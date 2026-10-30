import { describe, it, expect } from "vitest";

import {
  createModelSelector,
  MODEL_SELECTOR_VERSION,
  MODEL_SELECTION_ERRORS,
} from "../../src/runtime/model-selector.js";

import {
  createModelRegistry,
} from "../../src/runtime/model-registry.js";

function createAdapter(id, overrides = {}) {
  return {
    id,
    type: "local",
    modelId: `model-${id}`,
    version: "1.0.0",
    available: true,
    languages: ["sq", "en"],
    capabilities: ["chat", "knowledge"],
    async generate() {
      return { text: "XSUS AI response" };
    },
    ...overrides,
  };
}

function createRegistry(adapters = []) {
  return createModelRegistry({ adapters });
}

function createSelector(adapters = [], options = {}) {
  const registry = createRegistry(adapters);

  const selector = createModelSelector({
    registry,
    ...options,
  });

  return { registry, selector };
}

describe("XSUS AI Core — Model Selector", () => {
  it("ekspozon version-in e saktë", () => {
    const { selector } = createSelector();

    expect(MODEL_SELECTOR_VERSION).toBe("1.0.0");
    expect(selector.getStatus().version).toBe("1.0.0");
  });

  it("refuzon konfigurimin që nuk është objekt i thjeshtë", () => {
    expect(() => createModelSelector(null)).toThrow(TypeError);
    expect(() => createModelSelector([])).toThrow(TypeError);
    expect(() => createModelSelector("invalid")).toThrow(TypeError);
  });

  it("refuzon registry të pavlefshëm", () => {
    try {
      createModelSelector({});
      throw new Error("Pritej që konfigurimi të dështonte.");
    } catch (error) {
      expect(error.code).toBe(
        MODEL_SELECTION_ERRORS.REGISTRY_INVALID,
      );
    }

    expect(() =>
      createModelSelector({
        registry: {
          get() {},
          list() {},
        },
      }),
    ).toThrow(
      "Model Selector kërkon një Model Registry të vlefshëm.",
    );
  });

  it("zgjedh modelin e parë të disponueshëm kur nuk ka preferencë", () => {
    const first = createAdapter("model-a");
    const second = createAdapter("model-b");

    const { selector } = createSelector([first, second]);

    expect(selector.select()).toBe(first);
  });

  it("zgjedh modelin e kërkuar sipas ID-së", () => {
    const first = createAdapter("model-a");
    const second = createAdapter("model-b");

    const { selector } = createSelector([first, second]);

    expect(selector.select({ modelId: "model-b" })).toBe(second);
  });

  it("normalizon hapësirat në ID-në e kërkuar", () => {
    const adapter = createAdapter("model-a");
    const { selector } = createSelector([adapter]);

    expect(
      selector.select({ modelId: "  model-a  " }),
    ).toBe(adapter);
  });

  it("raporton modelin e kërkuar kur nuk ekziston", () => {
    const { selector } = createSelector([
      createAdapter("model-a"),
    ]);

    try {
      selector.select({ modelId: "missing-model" });
      throw new Error("Pritej që përzgjedhja të dështonte.");
    } catch (error) {
      expect(error.code).toBe(
        MODEL_SELECTION_ERRORS.MODEL_NOT_FOUND,
      );
    }
  });

  it("refuzon modelin që nuk është i disponueshëm", () => {
    const adapter = createAdapter("model-a", {
      available: false,
    });

    const { selector } = createSelector([adapter]);

    expect(() =>
      selector.select({ modelId: "model-a" }),
    ).toThrow(
      expect.objectContaining({
        code: MODEL_SELECTION_ERRORS.NO_COMPATIBLE_MODEL,
      }),
    );
  });

  it("filtron modelet sipas gjuhës", () => {
    const albanian = createAdapter("model-sq", {
      languages: ["sq"],
    });

    const french = createAdapter("model-fr", {
      languages: ["fr"],
    });

    const { selector } = createSelector([
      albanian,
      french,
    ]);

    expect(selector.select({ language: "fr" })).toBe(french);
    expect(selector.listCompatible({ language: "sq" })).toEqual([
      albanian,
    ]);
  });

  it("pranon modelet pa kufizime gjuhësore të deklaruara", () => {
    const adapter = createAdapter("model-universal", {
      languages: [],
    });

    const { selector } = createSelector([adapter]);

    expect(selector.select({ language: "ja" })).toBe(adapter);
  });

  it("pranon modelet që deklarojnë mbështetje për të gjitha gjuhët", () => {
    const adapter = createAdapter("model-universal", {
      languages: ["*"],
    });

    const { selector } = createSelector([adapter]);

    expect(selector.select({ language: "de" })).toBe(adapter);
  });

  it("filtron modelet sipas aftësive të kërkuara", () => {
    const basic = createAdapter("model-basic", {
      capabilities: ["chat"],
    });

    const advanced = createAdapter("model-advanced", {
      capabilities: ["chat", "knowledge", "reasoning"],
    });

    const { selector } = createSelector([basic, advanced]);

    expect(
      selector.select({
        requiredCapabilities: ["reasoning"],
      }),
    ).toBe(advanced);
  });

  it("kërkon të gjitha aftësitë e deklaruara", () => {
    const adapter = createAdapter("model-a", {
      capabilities: ["chat", "knowledge"],
    });

    const { selector } = createSelector([adapter]);

    expect(
      selector.canSelect({
        requiredCapabilities: ["chat", "reasoning"],
      }),
    ).toBe(false);
  });

  it("normalizon shkronjat dhe heq vlerat e përsëritura nga listat", () => {
    const adapter = createAdapter("model-a", {
      capabilities: ["CHAT", "knowledge"],
      languages: ["SQ", "EN"],
    });

    const { selector } = createSelector([adapter]);

    expect(
      selector.select({
        language: "sq",
        requiredCapabilities: ["CHAT", "chat"],
      }),
    ).toBe(adapter);
  });

  it("përdor modelin e parazgjedhur kur ai është kompatibil", () => {
    const first = createAdapter("model-a");
    const preferred = createAdapter("model-b");

    const { selector } = createSelector(
      [first, preferred],
      { defaultModelId: "model-b" },
    );

    expect(selector.select()).toBe(preferred);
    expect(selector.getDefaultModel()).toBe(preferred);
  });

  it("nuk përdor modelin e parazgjedhur kur ai nuk është kompatibil", () => {
    const first = createAdapter("model-a", {
      languages: ["sq"],
    });

    const preferred = createAdapter("model-b", {
      languages: ["fr"],
    });

    const { selector } = createSelector(
      [first, preferred],
      { defaultModelId: "model-b" },
    );

    expect(selector.select({ language: "sq" })).toBe(first);
  });

  it("kthen null kur nuk është konfiguruar model i parazgjedhur", () => {
    const { selector } = createSelector();

    expect(selector.getDefaultModel()).toBeNull();
  });

  it("kthen null kur modeli i parazgjedhur nuk ekziston", () => {
    const { selector } = createSelector([], {
      defaultModelId: "missing-model",
    });

    expect(selector.getDefaultModel()).toBeNull();
  });

  it("kthen false nga canSelect kur nuk ka model kompatibil", () => {
    const { selector } = createSelector([
      createAdapter("model-a", {
        available: false,
      }),
    ]);

    expect(selector.canSelect()).toBe(false);
  });

  it("kthen false nga canSelect për kërkesa të pavlefshme", () => {
    const { selector } = createSelector([
      createAdapter("model-a"),
    ]);

    expect(selector.canSelect(null)).toBe(false);
    expect(
      selector.canSelect({
        requiredCapabilities: "chat",
      }),
    ).toBe(false);
  });

  it("refuzon kërkesa që nuk janë objekte të thjeshta", () => {
    const { selector } = createSelector();

    expect(() => selector.select(null)).toThrow(
      expect.objectContaining({
        code: MODEL_SELECTION_ERRORS.INVALID_REQUEST,
      }),
    );

    expect(() => selector.select([])).toThrow(
      expect.objectContaining({
        code: MODEL_SELECTION_ERRORS.INVALID_REQUEST,
      }),
    );
  });

  it("refuzon listat e aftësive të pavlefshme gjatë përzgjedhjes", () => {
    const { selector } = createSelector([
      createAdapter("model-a"),
    ]);

    expect(() =>
      selector.select({
        requiredCapabilities: "chat",
      }),
    ).toThrow(
      expect.objectContaining({
        code: MODEL_SELECTION_ERRORS.INVALID_REQUEST,
      }),
    );
  });

  it("refuzon filtrat e pavlefshëm në listCompatible", () => {
    const { selector } = createSelector();

    expect(() => selector.listCompatible(null)).toThrow(
      expect.objectContaining({
        code: MODEL_SELECTION_ERRORS.INVALID_REQUEST,
      }),
    );

    expect(() =>
      selector.listCompatible({
        requiredCapabilities: "chat",
      }),
    ).toThrow(TypeError);
  });

  it("kthen vetëm modelet kompatibile dhe të disponueshme", () => {
    const compatible = createAdapter("model-compatible");

    const unavailable = createAdapter("model-unavailable", {
      available: false,
    });

    const incompatible = createAdapter("model-incompatible", {
      languages: ["fr"],
    });

    const { selector } = createSelector([
      compatible,
      unavailable,
      incompatible,
    ]);

    expect(
      selector.listCompatible({ language: "sq" }),
    ).toEqual([compatible]);
  });

  it("kthen statusin e regjistrit dhe konfigurimin e parazgjedhur", () => {
    const { selector } = createSelector(
      [
        createAdapter("model-a"),
        createAdapter("model-b"),
      ],
      { defaultModelId: "model-b" },
    );

    expect(selector.getStatus()).toEqual({
      version: "1.0.0",
      defaultModelId: "model-b",
      registeredModels: 2,
    });
  });

  it("ekspozon një API të ngrirë", () => {
    const { selector } = createSelector();

    expect(Object.isFrozen(selector)).toBe(true);
  });
});
