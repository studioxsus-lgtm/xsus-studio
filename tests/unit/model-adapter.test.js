import { describe, it, expect, vi } from "vitest";

import {
  createModelAdapter,
  MODEL_ADAPTER_VERSION,
  MODEL_ADAPTER_TYPES,
} from "../../src/runtime/model-adapter.js";

function createAdapter(overrides = {}) {
  return createModelAdapter({
    id: "test-adapter",
    modelId: "test-model",
    generate: vi.fn(async (request) => ({
      text: `Response: ${request.prompt ?? "test"}`,
    })),
    ...overrides,
  });
}

describe("XSUS AI Core — Model Adapter", () => {
  describe("Version and constants", () => {
    it("ekspozon versionin e saktë", () => {
      expect(MODEL_ADAPTER_VERSION).toBe("1.0.0");
    });

    it("ekspozon llojet e mbështetura të adapter-it", () => {
      expect(MODEL_ADAPTER_TYPES).toEqual({
        LOCAL: "local",
        REMOTE: "remote",
        CUSTOM: "custom",
      });
    });

    it("ruan pandryshueshmërinë e konstanteve", () => {
      expect(Object.isFrozen(MODEL_ADAPTER_TYPES)).toBe(true);
    });
  });

  describe("Adapter creation", () => {
    it("krijon një adapter me konfigurim minimal", () => {
      const adapter = createAdapter();

      expect(adapter.id).toBe("test-adapter");
      expect(adapter.modelId).toBe("test-model");
      expect(adapter.type).toBe(MODEL_ADAPTER_TYPES.CUSTOM);
      expect(adapter.version).toBe(MODEL_ADAPTER_VERSION);
    });

    it("pranon llojin LOCAL", () => {
      const adapter = createAdapter({
        type: MODEL_ADAPTER_TYPES.LOCAL,
      });

      expect(adapter.type).toBe("local");
    });

    it("pranon llojin REMOTE", () => {
      const adapter = createAdapter({
        type: MODEL_ADAPTER_TYPES.REMOTE,
      });

      expect(adapter.type).toBe("remote");
    });

    it("pranon llojin CUSTOM", () => {
      const adapter = createAdapter({
        type: MODEL_ADAPTER_TYPES.CUSTOM,
      });

      expect(adapter.type).toBe("custom");
    });

    it("pastron hapësirat e panevojshme në identifikues", () => {
      const adapter = createAdapter({
        id: "  local-adapter  ",
        modelId: "  local-model  ",
      });

      expect(adapter.id).toBe("local-adapter");
      expect(adapter.modelId).toBe("local-model");
    });

    it("kthen një objekt adapter-i të ngrirë", () => {
      const adapter = createAdapter();

      expect(Object.isFrozen(adapter)).toBe(true);
    });
  });

  describe("Configuration validation", () => {
    it("refuzon konfigurimin null", () => {
      expect(() => createModelAdapter(null)).toThrow(
        "Konfigurimi i model adapter duhet të jetë objekt.",
      );
    });

    it("refuzon konfigurimin array", () => {
      expect(() => createModelAdapter([])).toThrow(
        "Konfigurimi i model adapter duhet të jetë objekt.",
      );
    });

    it("refuzon konfigurimin string", () => {
      expect(() => createModelAdapter("invalid")).toThrow(
        "Konfigurimi i model adapter duhet të jetë objekt.",
      );
    });

    it("refuzon identifikuesin që mungon", () => {
      expect(() =>
        createModelAdapter({
          modelId: "test-model",
          generate: vi.fn(),
        }),
      ).toThrow(
        "Model adapter duhet të ketë një identifikues të vlefshëm.",
      );
    });

    it("refuzon identifikuesin bosh", () => {
      expect(() =>
        createAdapter({ id: "   " }),
      ).toThrow(
        "Model adapter duhet të ketë një identifikues të vlefshëm.",
      );
    });

    it("refuzon identifikuesin që nuk është string", () => {
      expect(() =>
        createAdapter({ id: 123 }),
      ).toThrow(
        "Model adapter duhet të ketë një identifikues të vlefshëm.",
      );
    });

    it("refuzon modelId që mungon", () => {
      expect(() =>
        createModelAdapter({
          id: "test-adapter",
          generate: vi.fn(),
        }),
      ).toThrow(
        "Model adapter duhet të ketë një modelId të vlefshëm.",
      );
    });

    it("refuzon modelId bosh", () => {
      expect(() =>
        createAdapter({ modelId: "   " }),
      ).toThrow(
        "Model adapter duhet të ketë një modelId të vlefshëm.",
      );
    });

    it("refuzon modelId që nuk është string", () => {
      expect(() =>
        createAdapter({ modelId: 123 }),
      ).toThrow(
        "Model adapter duhet të ketë një modelId të vlefshëm.",
      );
    });

    it("refuzon një lloj adapter-i të pambështetur", () => {
      expect(() =>
        createAdapter({ type: "unsupported" }),
      ).toThrow(
        "Lloji i model adapter nuk mbështetet: unsupported",
      );
    });

    it("refuzon generate që mungon", () => {
      expect(() =>
        createModelAdapter({
          id: "test-adapter",
          modelId: "test-model",
        }),
      ).toThrow(
        "Model adapter duhet të implementojë funksionin generate().",
      );
    });

    it("refuzon generate që nuk është funksion", () => {
      expect(() =>
        createAdapter({ generate: "invalid" }),
      ).toThrow(
        "Model adapter duhet të implementojë funksionin generate().",
      );
    });

    it("refuzon initialize që nuk është funksion", () => {
      expect(() =>
        createAdapter({ initialize: true }),
      ).toThrow("initialize duhet të jetë funksion.");
    });

    it("refuzon close që nuk është funksion", () => {
      expect(() =>
        createAdapter({ close: true }),
      ).toThrow("close duhet të jetë funksion.");
    });

    it("refuzon getStatus që nuk është funksion", () => {
      expect(() =>
        createAdapter({ getStatus: true }),
      ).toThrow("getStatus duhet të jetë funksion.");
    });
  });

  describe("Initialization", () => {
    it("përdor initialize default kur nuk jepet implementim", async () => {
      const adapter = createAdapter();

      const result = await adapter.initialize();

      expect(result).toEqual({
        success: true,
        initialized: true,
        adapterId: "test-adapter",
      });
    });

    it("delegon inicializimin te implementimi i dhënë", async () => {
      const initialize = vi.fn(async (context) => ({
        success: true,
        initialized: true,
        context,
      }));

      const adapter = createAdapter({ initialize });
      const context = { environment: "test" };

      const result = await adapter.initialize(context);

      expect(initialize).toHaveBeenCalledOnce();
      expect(initialize).toHaveBeenCalledWith(context);
      expect(result.context).toBe(context);
    });

    it("përdor kontekst bosh si parazgjedhje", async () => {
      const initialize = vi.fn(async () => ({
        initialized: true,
      }));

      const adapter = createAdapter({ initialize });

      await adapter.initialize();

      expect(initialize).toHaveBeenCalledWith({});
    });

    it("propagon gabimin e inicializimit", async () => {
      const error = new Error("Initialization failed");

      const adapter = createAdapter({
        initialize: vi.fn(async () => {
          throw error;
        }),
      });

      await expect(adapter.initialize()).rejects.toBe(error);
    });
  });

  describe("Generation", () => {
    it("delegon kërkesën te funksioni generate", async () => {
      const generate = vi.fn(async () => ({
        text: "Hello from model",
      }));

      const adapter = createAdapter({ generate });
      const request = { prompt: "Hello" };

      const result = await adapter.generate(request);

      expect(generate).toHaveBeenCalledOnce();
      expect(generate).toHaveBeenCalledWith(request);
      expect(result).toEqual({
        text: "Hello from model",
      });
    });

    it("pranon kërkesë objekt", async () => {
      const adapter = createAdapter();

      await expect(
        adapter.generate({ prompt: "Test" }),
      ).resolves.toEqual({
        text: "Response: Test",
      });
    });

    it("refuzon kërkesën null", async () => {
      const adapter = createAdapter();

      await expect(
        adapter.generate(null),
      ).rejects.toThrow(
        "Kërkesa për modelin duhet të jetë objekt.",
      );
    });

    it("refuzon kërkesën array", async () => {
      const adapter = createAdapter();

      await expect(
        adapter.generate([]),
      ).rejects.toThrow(
        "Kërkesa për modelin duhet të jetë objekt.",
      );
    });

    it("refuzon kërkesën string", async () => {
      const adapter = createAdapter();

      await expect(
        adapter.generate("invalid"),
      ).rejects.toThrow(
        "Kërkesa për modelin duhet të jetë objekt.",
      );
    });

    it("refuzon kërkesën numerike", async () => {
      const adapter = createAdapter();

      await expect(
        adapter.generate(123),
      ).rejects.toThrow(
        "Kërkesa për modelin duhet të jetë objekt.",
      );
    });

    it("nuk thërret modelin kur kërkesa është e pavlefshme", async () => {
      const generate = vi.fn();
      const adapter = createAdapter({ generate });

      await expect(
        adapter.generate(null),
      ).rejects.toThrow();

      expect(generate).not.toHaveBeenCalled();
    });

    it("propagon gabimet e implementimit generate", async () => {
      const error = new Error("Inference failed");

      const adapter = createAdapter({
        generate: vi.fn(async () => {
          throw error;
        }),
      });

      await expect(
        adapter.generate({ prompt: "Test" }),
      ).rejects.toBe(error);
    });

    it("mbështet përgjigje asinkrone", async () => {
      const adapter = createAdapter({
        generate: async () => {
          await Promise.resolve();

          return {
            text: "Async response",
          };
        },
      });

      await expect(
        adapter.generate({ prompt: "Test" }),
      ).resolves.toEqual({
        text: "Async response",
      });
    });
  });

  describe("Closing", () => {
    it("përdor close default kur nuk jepet implementim", async () => {
      const adapter = createAdapter();

      const result = await adapter.close();

      expect(result).toEqual({
        success: true,
        closed: true,
        adapterId: "test-adapter",
      });
    });

    it("delegon mbylljen te implementimi i dhënë", async () => {
      const close = vi.fn(async (context) => ({
        success: true,
        closed: true,
        context,
      }));

      const adapter = createAdapter({ close });
      const context = { reason: "shutdown" };

      const result = await adapter.close(context);

      expect(close).toHaveBeenCalledOnce();
      expect(close).toHaveBeenCalledWith(context);
      expect(result.context).toBe(context);
    });

    it("përdor kontekst bosh si parazgjedhje", async () => {
      const close = vi.fn(async () => ({
        closed: true,
      }));

      const adapter = createAdapter({ close });

      await adapter.close();

      expect(close).toHaveBeenCalledWith({});
    });

    it("propagon gabimin e mbylljes", async () => {
      const error = new Error("Close failed");

      const adapter = createAdapter({
        close: vi.fn(async () => {
          throw error;
        }),
      });

      await expect(adapter.close()).rejects.toBe(error);
    });
  });

  describe("Status", () => {
    it("kthen statusin default", async () => {
      const adapter = createAdapter();

      const status = await adapter.getStatus();

      expect(status).toEqual({
        adapterId: "test-adapter",
        adapterType: MODEL_ADAPTER_TYPES.CUSTOM,
        modelId: "test-model",
        adapterVersion: MODEL_ADAPTER_VERSION,
        available: true,
      });
    });

    it("delegon marrjen e statusit te implementimi", async () => {
      const getStatus = vi.fn(async () => ({
        available: false,
        reason: "Model unavailable",
      }));

      const adapter = createAdapter({ getStatus });
      const status = await adapter.getStatus();

      expect(getStatus).toHaveBeenCalledOnce();
      expect(status.available).toBe(false);
      expect(status.reason).toBe("Model unavailable");
    });

    it("plotëson metadata-n e adapter-it në status", async () => {
      const adapter = createAdapter({
        type: MODEL_ADAPTER_TYPES.LOCAL,
        getStatus: async () => ({
          available: true,
          loaded: true,
        }),
      });

      const status = await adapter.getStatus();

      expect(status).toMatchObject({
        adapterId: "test-adapter",
        adapterType: MODEL_ADAPTER_TYPES.LOCAL,
        modelId: "test-model",
        adapterVersion: MODEL_ADAPTER_VERSION,
        available: true,
        loaded: true,
      });
    });

    it("refuzon statusin null", async () => {
      const adapter = createAdapter({
        getStatus: async () => null,
      });

      await expect(
        adapter.getStatus(),
      ).rejects.toThrow(
        "Statusi i adapter-it duhet të jetë objekt.",
      );
    });

    it("refuzon statusin array", async () => {
      const adapter = createAdapter({
        getStatus: async () => [],
      });

      await expect(
        adapter.getStatus(),
      ).rejects.toThrow(
        "Statusi i adapter-it duhet të jetë objekt.",
      );
    });

    it("refuzon statusin që nuk është objekt", async () => {
      const adapter = createAdapter({
        getStatus: async () => "available",
      });

      await expect(
        adapter.getStatus(),
      ).rejects.toThrow(
        "Statusi i adapter-it duhet të jetë objekt.",
      );
    });

    it("propagon gabimin e implementimit getStatus", async () => {
      const error = new Error("Status failed");

      const adapter = createAdapter({
        getStatus: async () => {
          throw error;
        },
      });

      await expect(
        adapter.getStatus(),
      ).rejects.toBe(error);
    });

    it("metadata e adapter-it mbishkruan metadata konfliktuale", async () => {
      const adapter = createAdapter({
        getStatus: async () => ({
          adapterId: "fake-id",
          adapterType: "fake-type",
          modelId: "fake-model",
          adapterVersion: "0.0.1",
          available: true,
        }),
      });

      const status = await adapter.getStatus();

      expect(status.adapterId).toBe("test-adapter");
      expect(status.adapterType).toBe(MODEL_ADAPTER_TYPES.CUSTOM);
      expect(status.modelId).toBe("test-model");
      expect(status.adapterVersion).toBe(MODEL_ADAPTER_VERSION);
    });
  });

  describe("Adapter immutability", () => {
    it("nuk lejon ndryshimin e identifikuesit", () => {
      const adapter = createAdapter();

      expect(() => {
        adapter.id = "changed-id";
      }).toThrow();
    });

    it("nuk lejon shtimin e pronave të reja", () => {
      const adapter = createAdapter();

      expect(() => {
        adapter.newProperty = true;
      }).toThrow();
    });

    it("ruan funksionet publike të adapter-it", () => {
      const adapter = createAdapter();

      expect(typeof adapter.initialize).toBe("function");
      expect(typeof adapter.generate).toBe("function");
      expect(typeof adapter.close).toBe("function");
      expect(typeof adapter.getStatus).toBe("function");
    });
  });
});
