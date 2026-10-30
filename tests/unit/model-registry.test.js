import { describe, it, expect } from "vitest";

import {
  createModelRegistry,
  MODEL_REGISTRY_VERSION,
  MODEL_REGISTRY_ERRORS,
} from "../../src/runtime/model-registry.js";

function createAdapter(id, overrides = {}) {
  return {
    id,
    type: "local",
    modelId: `model-${id}`,
    version: "1.0.0",
    async generate() {
      return {
        text: "XSUS AI response",
      };
    },
    ...overrides,
  };
}

describe("XSUS AI Core — Model Registry", () => {
  it("ekspozon version-in e saktë", () => {
    const registry = createModelRegistry();

    expect(MODEL_REGISTRY_VERSION).toBe("1.0.0");
    expect(registry.getStatus().version).toBe("1.0.0");
  });

  it("regjistron dhe gjen një adapter", () => {
    const registry = createModelRegistry();
    const adapter = createAdapter("xsus-local");

    const registered = registry.register(adapter);

    expect(registered).toBe(adapter);
    expect(registry.get("xsus-local")).toBe(adapter);
    expect(registry.has("xsus-local")).toBe(true);
    expect(registry.getSize()).toBe(1);
  });

  it("normalizon hapësirat në ID gjatë kërkimit", () => {
    const registry = createModelRegistry();
    const adapter = createAdapter("xsus-local");

    registry.register(adapter);

    expect(registry.get("  xsus-local  ")).toBe(adapter);
    expect(registry.has("  xsus-local  ")).toBe(true);
  });

  it("refuzon adapter-ë të pavlefshëm", () => {
    const registry = createModelRegistry();

    expect(() => registry.register(null)).toThrow(TypeError);
    expect(() => registry.register([])).toThrow(TypeError);
    expect(() => registry.register("adapter")).toThrow(TypeError);
    expect(() => registry.register({ id: "model-a" })).toThrow(
      "Model adapter duhet të implementojë generate().",
    );
  });

  it("refuzon ID të pavlefshme të adapter-it", () => {
    const registry = createModelRegistry();

    expect(() => registry.register(createAdapter(""))).toThrow(
      "Model adapter duhet të ketë një ID të vlefshme.",
    );

    expect(() => registry.register(createAdapter("   "))).toThrow(
      "Model adapter duhet të ketë një ID të vlefshme.",
    );
  });

  it("refuzon regjistrimin e ID-ve të dyfishta", () => {
    const registry = createModelRegistry();

    registry.register(createAdapter("xsus-local"));

    try {
      registry.register(createAdapter("xsus-local"));
      throw new Error("Pritej që regjistrimi i dytë të dështonte.");
    } catch (error) {
      expect(error.code).toBe(MODEL_REGISTRY_ERRORS.DUPLICATE_ID);
      expect(error.message).toContain("xsus-local");
    }

    expect(registry.getSize()).toBe(1);
  });

  it("kthen null kur adapter-i nuk ekziston", () => {
    const registry = createModelRegistry();

    expect(registry.get("missing-model")).toBeNull();
    expect(registry.has("missing-model")).toBe(false);
  });

  it("liston adapter-ët sipas rendit të regjistrimit", () => {
    const registry = createModelRegistry();

    const first = createAdapter("model-a");
    const second = createAdapter("model-b");

    registry.register(first);
    registry.register(second);

    expect(registry.list()).toEqual([first, second]);
  });

  it("kthen metadata të modeleve pa ekspozuar objektet e plota", () => {
    const registry = createModelRegistry();

    registry.register(
      createAdapter("model-a", {
        type: "local",
        modelId: "xsus-model-a",
        version: "2.0.0",
        secret: "must-not-appear",
      }),
    );

    registry.register(
      createAdapter("model-b", {
        type: undefined,
        modelId: undefined,
        version: undefined,
      }),
    );

    expect(registry.listMetadata()).toEqual([
      {
        id: "model-a",
        type: "local",
        modelId: "xsus-model-a",
        version: "2.0.0",
      },
      {
        id: "model-b",
        type: "custom",
        modelId: null,
        version: null,
      },
    ]);

    expect(registry.listMetadata()[0]).not.toHaveProperty("secret");
  });

  it("heq një adapter ekzistues", () => {
    const registry = createModelRegistry();

    registry.register(createAdapter("model-a"));

    expect(registry.unregister("model-a")).toBe(true);
    expect(registry.get("model-a")).toBeNull();
    expect(registry.has("model-a")).toBe(false);
    expect(registry.getSize()).toBe(0);
  });

  it("kthen false kur kërkohet heqja e një adapter-i që mungon", () => {
    const registry = createModelRegistry();

    expect(registry.unregister("missing-model")).toBe(false);
  });

  it("pastron të gjithë adapter-ët dhe kthen numrin e hequr", () => {
    const registry = createModelRegistry();

    registry.register(createAdapter("model-a"));
    registry.register(createAdapter("model-b"));

    expect(registry.clear()).toBe(2);
    expect(registry.getSize()).toBe(0);
    expect(registry.list()).toEqual([]);
  });

  it("kthen një status të saktë të regjistrit", () => {
    const registry = createModelRegistry();

    registry.register(createAdapter("model-a"));
    registry.register(createAdapter("model-b"));

    expect(registry.getStatus()).toEqual({
      version: "1.0.0",
      size: 2,
      modelIds: ["model-a", "model-b"],
    });
  });

  it("refuzon konfigurimin që nuk është objekt", () => {
    expect(() => createModelRegistry(null)).toThrow(TypeError);
    expect(() => createModelRegistry([])).toThrow(TypeError);
    expect(() => createModelRegistry("invalid")).toThrow(TypeError);
  });

  it("regjistron adapter-ët fillestarë nga konfigurimi", () => {
    const first = createAdapter("model-a");
    const second = createAdapter("model-b");

    const registry = createModelRegistry({
      adapters: [first, second],
    });

    expect(registry.getSize()).toBe(2);
    expect(registry.get("model-a")).toBe(first);
    expect(registry.get("model-b")).toBe(second);
  });

  it("refuzon ID të pavlefshme në kërkim dhe heqje", () => {
    const registry = createModelRegistry();

    expect(() => registry.get("")).toThrow(TypeError);
    expect(() => registry.has("   ")).toThrow(TypeError);
    expect(() => registry.unregister("")).toThrow(TypeError);
  });

  it("nuk lejon ndryshimin e drejtpërdrejtë të API-së së regjistrit", () => {
    const registry = createModelRegistry();

    expect(Object.isFrozen(registry)).toBe(true);
    expect(() => {
      registry.register = () => null;
    }).toThrow(TypeError);
  });
});
