
/**
 * XSUS APP — HYPER NEXUS
 * Frontier Navigation Context Tests
 * Version: 1.0.0
 * Phase: 1.8.21
 *
 * Tests:
 * - Canonical route resolution
 * - Legacy Frontier route preservation
 * - Engines / Monitoring distinction
 * - Unknown route fallback
 * - Immutable navigation context
 * - Tracker lifecycle
 *
 * Does not modify browser history.
 */

import {
  describe,
  test,
  expect
} from "vitest";

import {
  FRONTIER_NAVIGATION_CONTEXT_VERSION,
  resolveFrontierNavigationContext,
  createFrontierNavigationContext
} from "../../app-ui/shell/frontier-navigation-context.js";

describe("Frontier Navigation Context", () => {
  test("exports version 1.0.0", () => {
    expect(
      FRONTIER_NAVIGATION_CONTEXT_VERSION
    ).toBe("1.0.0");
  });

  test("resolves overview", () => {
    const result =
      resolveFrontierNavigationContext("overview");

    expect(result.moduleId).toBe("overview");
    expect(result.frontierRoute).toBe("overview");
    expect(result.canonicalRoute).toBe("#overview");
    expect(result.isFallback).toBe(false);
  });

  test("resolves architect to command-center", () => {
    const result =
      resolveFrontierNavigationContext("#architect");

    expect(result.moduleId).toBe("command-center");
    expect(result.frontierRoute).toBe("architect");
    expect(result.isFrontierRoute).toBe(true);
  });

  test("resolves workspace", () => {
    const result =
      resolveFrontierNavigationContext("workspace");

    expect(result.moduleId).toBe("living-workspace");
    expect(result.frontierRoute).toBe("workspace");
  });

  test("resolves nexus", () => {
    const result =
      resolveFrontierNavigationContext("nexus");

    expect(result.moduleId).toBe("integration-layer");
    expect(result.frontierRoute).toBe("nexus");
  });

  test("resolves engines", () => {
    const result =
      resolveFrontierNavigationContext("engines");

    expect(result.moduleId).toBe("system-control");
    expect(result.frontierRoute).toBe("engines");
  });

  test("resolves monitoring", () => {
    const result =
      resolveFrontierNavigationContext("monitoring");

    expect(result.moduleId).toBe("system-control");
    expect(result.frontierRoute).toBe("monitoring");
  });

  test("keeps engines and monitoring distinct", () => {
    const engines =
      resolveFrontierNavigationContext("engines");

    const monitoring =
      resolveFrontierNavigationContext("monitoring");

    expect(engines.moduleId).toBe(monitoring.moduleId);
    expect(engines.frontierRoute).not.toBe(
      monitoring.frontierRoute
    );
  });

  test("resolves architecture", () => {
    const result =
      resolveFrontierNavigationContext("architecture");

    expect(result.moduleId).toBe("architecture");
    expect(result.frontierRoute).toBe("architecture");
  });

  test("accepts canonical module identifiers", () => {
    const result =
      resolveFrontierNavigationContext("multi-agent");

    expect(result.moduleId).toBe("multi-agent");
    expect(result.frontierRoute).toBeNull();
    expect(result.isFrontierRoute).toBe(false);
  });

  test("normalizes whitespace and case", () => {
    const result =
      resolveFrontierNavigationContext(" #MONITORING ");

    expect(result.requestedRoute).toBe("monitoring");
    expect(result.moduleId).toBe("system-control");
    expect(result.frontierRoute).toBe("monitoring");
  });

  test("falls back on unknown routes", () => {
    const result =
      resolveFrontierNavigationContext("unknown-module");

    expect(result.moduleId).toBe("overview");
    expect(result.frontierRoute).toBeNull();
    expect(result.isFallback).toBe(true);
  });

  test("handles non-string input", () => {
    const result =
      resolveFrontierNavigationContext(null);

    expect(result.moduleId).toBe("overview");
    expect(result.isFallback).toBe(true);
  });

  test("returns immutable navigation context", () => {
    const result =
      resolveFrontierNavigationContext("architect");

    expect(Object.isFrozen(result)).toBe(true);
  });

  test("creates a tracker", () => {
    const tracker =
      createFrontierNavigationContext();

    expect(tracker.getStatus().destroyed).toBe(false);
    expect(tracker.getCurrent().moduleId).toBe(
      "overview"
    );
  });

  test("updates tracker state", () => {
    const tracker =
      createFrontierNavigationContext();

    tracker.update("architect");

    expect(tracker.getCurrent().moduleId).toBe(
      "command-center"
    );

    expect(tracker.getCurrent().frontierRoute).toBe(
      "architect"
    );
  });

  test("detects canonical module changes", () => {
    const tracker =
      createFrontierNavigationContext();

    expect(tracker.hasChanged("architect")).toBe(true);

    tracker.update("architect");

    expect(tracker.hasChanged("workspace")).toBe(true);
  });

  test("detects changes within one canonical module", () => {
    const tracker =
      createFrontierNavigationContext();

    tracker.update("engines");

    expect(tracker.hasChanged("monitoring")).toBe(true);
  });

  test("does not report unchanged routes", () => {
    const tracker =
      createFrontierNavigationContext();

    tracker.update("monitoring");

    expect(tracker.hasChanged("#monitoring")).toBe(
      false
    );
  });

  test("resets tracker state", () => {
    const tracker =
      createFrontierNavigationContext();

    tracker.update("architect");

    expect(tracker.reset()).toBe(true);
    expect(tracker.getCurrent().moduleId).toBe(
      "overview"
    );
  });

  test("returns immutable tracker status", () => {
    const tracker =
      createFrontierNavigationContext();

    expect(
      Object.isFrozen(tracker.getStatus())
    ).toBe(true);
  });

  test("prevents updates after destruction", () => {
    const tracker =
      createFrontierNavigationContext();

    tracker.destroy();

    expect(() => tracker.update("architect")).toThrow(
      "Frontier Navigation Context is destroyed."
    );
  });

  test("prevents reset after destruction", () => {
    const tracker =
      createFrontierNavigationContext();

    tracker.destroy();

    expect(tracker.reset()).toBe(false);
    expect(tracker.hasChanged("architect")).toBe(false);
  });

  test("exposes immutable tracker API", () => {
    const tracker =
      createFrontierNavigationContext();

    expect(Object.isFrozen(tracker)).toBe(true);
  });
});
