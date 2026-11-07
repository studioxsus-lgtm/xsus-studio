
/**
 * XSUS APP — HYPER NEXUS
 * Dynamic Module Lifecycle & Isolation Tests
 *
 * @vitest-environment jsdom
 */

import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach
} from "vitest";

import {
  createModuleLoader
} from "../../app-ui/shell/module-loader.js";

function createDeferred() {
  let resolve;
  let reject;

  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe("Hyper Nexus — Dynamic Module Lifecycle", () => {
  let container;
  let loader;
  let overview;

  beforeEach(() => {
    document.body.innerHTML = `
      <main id="module-container">
        <section id="overview" data-module="overview">
          Static Overview
        </section>
      </main>

      <div id="loading" hidden>Loading...</div>
      <div id="error" hidden>Error</div>
    `;

    container = document.querySelector("#module-container");
    overview = document.querySelector("#overview");

    loader = createModuleLoader({
      container,
      loadingElement: document.querySelector("#loading"),
      errorElement: document.querySelector("#error")
    });
  });

  afterEach(() => {
    loader?.unloadModule();
    document.body.innerHTML = "";
  });

  function registerOverview(factory) {
    loader.registerModule("overview", factory);
  }

  test("ngarkon një modul asinkron", async () => {
    registerOverview(async () => {
      await Promise.resolve();

      const element = document.createElement("section");
      element.textContent = "Async module";

      return element;
    });

    const result = await loader.loadModule("overview");

    expect(result.success).toBe(true);
    expect(container.textContent).toContain("Async module");
  });

  test("shfaq loading gjatë ngarkimit", async () => {
    const deferred = createDeferred();

    registerOverview(() => deferred.promise);

    const pending = loader.loadModule("overview");

    expect(document.querySelector("#loading").hidden)
      .toBe(false);

    const element = document.createElement("section");
    deferred.resolve(element);

    await pending;

    expect(document.querySelector("#loading").hidden)
      .toBe(true);
  });

  test("unload anulon ngarkimin në pritje", async () => {
    const deferred = createDeferred();

    registerOverview(() => deferred.promise);

    const pending = loader.loadModule("overview");

    loader.unloadModule();

    const element = document.createElement("section");
    element.textContent = "Late module";

    deferred.resolve(element);

    const result = await pending;

    expect(result.success).toBe(false);
    expect(loader.getActiveModule()).toBeNull();
    expect(container.textContent).not.toContain("Late module");
  });

  test("ngarkimi më i vjetër nuk zëvendëson të riun", async () => {
    const first = createDeferred();
    let invocation = 0;

    registerOverview(() => {
      invocation += 1;

      if (invocation === 1) {
        return first.promise;
      }

      const element = document.createElement("section");
      element.textContent = "Latest module";

      return element;
    });

    const oldLoad = loader.loadModule("overview");
    const newLoad = loader.loadModule("overview");

    const newResult = await newLoad;

    const oldElement = document.createElement("section");
    oldElement.textContent = "Old module";

    first.resolve(oldElement);

    const oldResult = await oldLoad;

    expect(newResult.success).toBe(true);
    expect(oldResult.success).toBe(false);
    expect(container.textContent).toContain("Latest module");
    expect(container.textContent).not.toContain("Old module");
  });

  test("gabimi i factory nuk aktivizon modulin", async () => {
    registerOverview(async () => {
      throw new Error("Factory failure");
    });

    const result = await loader.loadModule("overview");

    expect(result.success).toBe(false);
    expect(loader.getActiveModule()).toBeNull();
  });

  test("refuzon element nga një dokument tjetër", async () => {
    const otherDocument = document.implementation
      .createHTMLDocument("Other");

    registerOverview(() =>
      otherDocument.createElement("section")
    );

    const result = await loader.loadModule("overview");

    expect(result.success).toBe(false);
  });

  test("modulet planned mbeten të bllokuara", async () => {
    const result = await loader.loadModule("architecture");

    expect(result.success).toBe(false);
    expect(result.reason).toBe("MODULE_NOT_AVAILABLE");
  });

  test("unload është i sigurt edhe pa modul aktiv", () => {
    expect(() => loader.unloadModule()).not.toThrow();
    expect(loader.getActiveModule()).toBeNull();
  });

  test("moduli dinamik nuk duhet të fshijë Overview", async () => {
    registerOverview(() => {
      const element = document.createElement("section");
      element.textContent = "Dynamic content";
      return element;
    });

    await loader.loadModule("overview");

    expect(document.querySelector("#overview"))
      .toBe(overview);
  });

});
