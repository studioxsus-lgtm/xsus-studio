import { describe, expect, it } from "vitest";
import {
  APPLICATION_PLANNER_VERSION, createApplicationPlan, createApplicationPlanExecutor
} from "../../platform/hyper-xsus-core/application-planner/application-planner.js";
import { createHyperApplicationDispatcher } from "../../platform/xsus-app/xsus-hyper-application-dispatcher.js";
const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const PROJECT = "33333333-3333-4333-8333-333333333333";
const args = { userId: USER, projectId: PROJECT, prompt: "Build a dashboard with login, search and reporting" };
describe("Hyper XSUS Core — application planner domain", () => {
  it("creates a deterministic, immutable, bounded plan", () => {
    const a = createApplicationPlan(args);
    const b = createApplicationPlan(args);
    expect(a).toEqual(b);
    expect(a.version).toBe(APPLICATION_PLANNER_VERSION);
    expect(a.features).toEqual(["authentication", "dashboard", "search", "reporting"]);
    expect(a.modules.map(m => m.id)).toEqual(["ui", "domain", "data", "auth"]);
    expect(a.steps.map(s => s.id)).toEqual(["requirements", "architecture", "implementation", "verification"]);
    expect(Object.isFrozen(a)).toBe(true);
    expect(Object.isFrozen(a.modules[0])).toBe(true);
    expect(Object.isFrozen(a.steps[1].dependsOn)).toBe(true);
  });
  it("keeps payment integration as a non-executing boundary", () => {
    const p = createApplicationPlan({ ...args, prompt: "Payment checkout and settings" });
    expect(p.features).toEqual(["payments", "settings"]);
    expect(p.modules.some(m => m.id === "payments")).toBe(true);
    expect(p.limitations.join(" ")).toContain("no source files");
  });
  it.each([
    [{ ...args, userId: OTHER.slice(0, 8) }, "user ID"],
    [{ ...args, projectId: "../other" }, "project ID"],
    [{ ...args, prompt: "" }, "Prompt"],
    [{ ...args, prompt: "x".repeat(8001) }, "Prompt"],
    [{ ...args, prompt: "bad\u0000input" }, "Prompt"],
    [{ ...args, prompt: 42 }, "text prompt"]
  ])("rejects malformed planner inputs", (input, message) => {
    expect(() => createApplicationPlan(input)).toThrow(message);
  });
  it("accepts 8000 printable characters and keeps output bounded", () => {
    const p = createApplicationPlan({ ...args, prompt: "x".repeat(8000) });
    expect(p.summary).toHaveLength(240);
    expect(p.features.length).toBeLessThanOrEqual(8);
  });
  it("rejects mismatched contract version before creating a plan", async () => {
    const execute = createApplicationPlanExecutor();
    await expect(execute({ ...args, contractVersion: "2.0.0" })).rejects.toThrow("contract version");
  });
  it("can be injected into authorization-first dispatcher without exposing internalPlan", async () => {
    const planApplication = createApplicationPlanExecutor();
    const dispatcher = createHyperApplicationDispatcher({
      verifyAccessToken: async () => ({ id: USER }),
      getProjectOwner: async () => USER,
      authorizeOperation: async () => true,
      planApplication,
      buildApplication: async () => { throw new Error("Build intentionally unavailable"); }
    });
    const response = await dispatcher.dispatch({
      authorization: "Bearer test_access_token_1234567890",
      body: { operation: "application.plan", projectId: PROJECT, prompt: args.prompt }
    });
    expect(response).toMatchObject({ operation: "application.plan", projectId: PROJECT, status: "completed" });
    expect(response).not.toHaveProperty("internalPlan");
    expect(response).not.toHaveProperty("userId");
  });
  it("does not run planner when ownership fails", async () => {
    let invoked = 0;
    const executor = createApplicationPlanExecutor();
    const dispatcher = createHyperApplicationDispatcher({
      verifyAccessToken: async () => ({ id: USER }),
      getProjectOwner: async () => OTHER,
      authorizeOperation: async () => true,
      planApplication: async x => { invoked++; return executor(x); },
      buildApplication: async () => { throw new Error("Unavailable"); }
    });
    await expect(dispatcher.dispatch({
      authorization: "Bearer test_access_token_1234567890",
      body: { operation: "application.plan", projectId: PROJECT, prompt: args.prompt }
    })).rejects.toThrow("project access denied");
    expect(invoked).toBe(0);
  });
});
