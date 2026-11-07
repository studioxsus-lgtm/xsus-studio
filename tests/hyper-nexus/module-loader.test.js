
/**
 * XSUS APP — HYPER NEXUS
 * Module Loader Unit Tests
 *
 * @vitest-environment jsdom
 */

import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  vi
} from "vitest";

import {
  createModuleLoader
} from "../../app-ui/shell/module-loader.js";

import {
  getAllModuleDefinitions
} from "../../app-ui/modules/module-registry.js";

describe("Hyper Nexus — Module Loader", () => {
  let container;
  let loadingElement;
  let errorElement;
  let loader;

  beforeEach(() => {
    document.body.innerHTML = `
      <main id="test-container"></main>
      <div id="test-loading" hidden>Loading...</div>
      <div id="test-error" hidden>Error</div>
    `;

    container = document.querySelector(
      "#test-container"
    );

    loadingElement = document.querySelector(
      "#test-loading"
    );

    errorElement = document.querySelector(
      "#test-error"
    );

    loader = createModuleLoader({
      container,
      loadingElement,
      errorElement
    });
  });

  afterEach(() => {
    loader?.unloadModule();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  test("krijon Module Loader", () => {
    expect(loader).toBeDefined();
    expect(typeof loader.registerModule).toBe("function");
    expect(typeof loader.loadModule).toBe("function");
    expect(typeof loader.unloadModule).toBe("function");
    expect(typeof loader.getActiveModule).toBe("function");
  });

  test("refuzon kontejner të pavlefshëm", () => {
    expect(() => createModuleLoader({
      container: null
    })).toThrow();
  });

  test("nuk ka module dinamike të regjistruara fillimisht", () => {
    expect(loader.listRegisteredModules()).toEqual([]);
  });

  test("refuzon regjistrimin e një moduli të panjohur", () => {
    expect(() => {
      loader.registerModule(
        "unknown-module",
        () => document.createElement("section")
      );
    }).toThrow();
  });

  test("refuzon regjistrimin e moduleve planned", () => {
    const planned = getAllModuleDefinitions()
      .filter(module => module.status === "planned");

    expect(planned).toHaveLength(8);

    for (const module of planned) {
      expect(() => {
        loader.registerModule(
          module.id,
          () => document.createElement("section")
        );
      }).toThrow();
    }
  });

  test("refuzon factory të pavlefshme", () => {
    expect(() => {
      loader.registerModule("overview", null);
    }).toThrow();
  });

  test("regjistron factory për modul available", () => {
    const factory = () =>
      document.createElement("section");

    loader.registerModule("overview", factory);

    expect(loader.isRegistered("overview")).toBe(true);
  });

  test("refuzon regjistrimin e dyfishtë", () => {
    const factory = () =>
      document.createElement("section");

    loader.registerModule("overview", factory);

    expect(() => {
      loader.registerModule("overview", factory);
    }).toThrow();
  });

  test("refuzon ngarkimin e modulit të panjohur", async () => {
    await expect(
      loader.loadModule("unknown-module")
    ).rejects.toThrow();
  });

  test("nuk ngarkon module planned", async () => {
    const result = await loader.loadModule(
      "command-center"
    );

    expect(result.success).toBe(false);
    expect(result.reason).toBe("MODULE_NOT_AVAILABLE");
  });

  test("nuk ngarkon modul pa factory", async () => {
    const result = await loader.loadModule("overview");

    expect(result.success).toBe(false);
    expect(result.reason).toBe("MODULE_NOT_REGISTERED");
  });

  test("ngarkon modul available me factory", async () => {
    loader.registerModule("overview", () => {
      const element = document.createElement("section");
      element.textContent = "Dynamic module";
      return element;
    });

    const result = await loader.loadModule("overview");

    expect(result.success).toBe(true);
    expect(container.textContent).toContain(
      "Dynamic module"
    );
  });

  test("unload pastron modulin aktiv", async () => {
    loader.registerModule("overview", () => {
      return document.createElement("section");
    });

    await loader.loadModule("overview");

    loader.unloadModule();

    expect(loader.getActiveModule()).toBeNull();
  });

  test("refuzon factory që kthen vlerë jo DOM", async () => {
    loader.registerModule("overview", () => {
      return "invalid element";
    });

    const result = await loader.loadModule("overview");

    expect(result.success).toBe(false);
  });

  test("refuzon përdorimin e container si modul", async () => {
    loader.registerModule("overview", () => container);

    const result = await loader.loadModule("overview");

    expect(result.success).toBe(false);
  });

});
