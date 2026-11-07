
/**
 * XSUS APP — HYPER NEXUS
 * Legacy Route Resolver Tests
 * Version: 1.0.0
 */

import {
  describe,
  test,
  expect
} from "vitest";

import {
  LEGACY_ROUTE_RESOLVER_VERSION,
  LEGACY_ROUTE_MAP,
  normalizeLegacyRoute,
  resolveLegacyRoute,
  isLegacyRoute,
  getLegacyRouteInfo
} from "../../app-ui/shell/legacy-route-resolver.js";

describe("Hyper Nexus — Legacy Route Resolver", () => {

  test("eksporton versionin e saktë", () => {
    expect(LEGACY_ROUTE_RESOLVER_VERSION).toBe("1.0.0");
  });

  test("ruan hartën e pandryshueshme", () => {
    expect(Object.isFrozen(LEGACY_ROUTE_MAP)).toBe(true);
  });

  test("normalizon hash dhe shkronjat", () => {
    expect(normalizeLegacyRoute("  #ARCHITECT  "))
      .toBe("architect");

    expect(normalizeLegacyRoute("##Workspace"))
      .toBe("workspace");
  });

  test("refuzon vlera jo-string", () => {
    expect(normalizeLegacyRoute(null)).toBe("");
    expect(normalizeLegacyRoute(undefined)).toBe("");
    expect(normalizeLegacyRoute(123)).toBe("");
  });

  test("ruan Overview", () => {
    expect(resolveLegacyRoute("#overview"))
      .toBe("overview");
  });

  test("përkthen Application Architect", () => {
    expect(resolveLegacyRoute("#architect"))
      .toBe("command-center");
  });

  test("përkthen Development Workspace", () => {
    expect(resolveLegacyRoute("#workspace"))
      .toBe("living-workspace");
  });

  test("përkthen XSUS Nexus", () => {
    expect(resolveLegacyRoute("#nexus"))
      .toBe("integration-layer");
  });

  test("përkthen Frontier Engines", () => {
    expect(resolveLegacyRoute("#engines"))
      .toBe("system-control");
  });

  test("përkthen System Monitoring", () => {
    expect(resolveLegacyRoute("#monitoring"))
      .toBe("system-control");
  });

  test("ruan Architecture", () => {
    expect(resolveLegacyRoute("#architecture"))
      .toBe("architecture");
  });

  test("pranon rrugë moderne të regjistruara", () => {
    expect(resolveLegacyRoute("#multi-agent"))
      .toBe("multi-agent");

    expect(resolveLegacyRoute("#workflow-studio"))
      .toBe("workflow-studio");
  });

  test("refuzon rrugë të panjohura", () => {
    expect(resolveLegacyRoute("#unknown-module"))
      .toBeNull();

    expect(resolveLegacyRoute(""))
      .toBeNull();
  });

  test("identifikon rrugët legacy", () => {
    expect(isLegacyRoute("#architect")).toBe(true);
    expect(isLegacyRoute("#nexus")).toBe(true);

    expect(isLegacyRoute("#multi-agent")).toBe(false);
    expect(isLegacyRoute("#unknown")).toBe(false);
  });

  test("kthen metadata të sakta për migrimin", () => {
    expect(getLegacyRouteInfo("#architect")).toEqual({
      originalRoute: "architect",
      moduleId: "command-center",
      isLegacy: true,
      requiresMigration: true
    });
  });

  test("nuk kërkon migrim për Overview", () => {
    expect(getLegacyRouteInfo("#overview")).toEqual({
      originalRoute: "overview",
      moduleId: "overview",
      isLegacy: true,
      requiresMigration: false
    });
  });

  test("nuk kërkon migrim për rrugët moderne", () => {
    expect(getLegacyRouteInfo("#multi-agent")).toEqual({
      originalRoute: "multi-agent",
      moduleId: "multi-agent",
      isLegacy: false,
      requiresMigration: false
    });
  });

  test("refuzon metadata për rrugë të panjohura", () => {
    expect(getLegacyRouteInfo("#unknown"))
      .toBeNull();
  });

});
