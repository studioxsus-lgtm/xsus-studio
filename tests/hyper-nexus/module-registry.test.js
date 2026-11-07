
import {
  describe,
  expect,
  test
} from "vitest";

import {
  getModuleDefinition,
  getAllModuleDefinitions,
  getModulesByStatus,
  isModuleRegistered,
  isModuleAvailable,
  getModuleRegistryStatus
} from "../../app-ui/modules/module-registry.js";

describe("Hyper Nexus — Module Registry", () => {

  test("regjistron nëntë modulet zyrtare", () => {
    const modules = getAllModuleDefinitions();

    expect(modules).toHaveLength(9);
    expect(new Set(modules.map(m => m.id)).size).toBe(9);
  });

  test("Overview është i disponueshëm", () => {
    expect(isModuleRegistered("overview")).toBe(true);
    expect(isModuleAvailable("overview")).toBe(true);
  });

  test("modulet e planifikuara nuk janë aktive", () => {
    const planned = getModulesByStatus("planned");

    expect(planned).toHaveLength(8);

    for (const module of planned) {
      expect(isModuleRegistered(module.id)).toBe(true);
      expect(isModuleAvailable(module.id)).toBe(false);
    }
  });

  test("çdo modul ka identitet dhe route të vlefshme", () => {
    const modules = getAllModuleDefinitions();

    for (const module of modules) {
      expect(module.id).toBeTruthy();
      expect(module.name).toBeTruthy();
      expect(module.title).toBeTruthy();
      expect(module.route).toBe(`#${module.id}`);
    }
  });

  test("kthen përkufizimin e modulit të kërkuar", () => {
    const module = getModuleDefinition("overview");

    expect(module).toBeDefined();
    expect(module.id).toBe("overview");
    expect(module.status).toBe("available");
  });

  test("refuzon module të panjohura", () => {
    expect(isModuleRegistered("unknown-module")).toBe(false);
    expect(isModuleAvailable("unknown-module")).toBe(false);
  });

  test("përkufizimet janë të pandryshueshme", () => {
    const modules = getAllModuleDefinitions();

    for (const module of modules) {
      expect(Object.isFrozen(module)).toBe(true);
    }
  });

  test("raporton statusin e registry", () => {
    const status = getModuleRegistryStatus();

    expect(status).toBeDefined();
    expect(typeof status).toBe("object");
  });

});
