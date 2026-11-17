import { describe, expect, it } from "vitest";
import { createStructuredOutputGuard } from "../../src/hyper-xsus-core/cross-cutting/structured-output-guard.js";
import { createSpecializedEngineCoordinator } from "../../src/hyper-xsus-core/cross-cutting/specialized-engine-coordinator.js";
import { createFiveEngineWorkflow } from "../../src/hyper-xsus-core/cross-cutting/five-engine-workflow.js";
const checks = ["coherence","completeness","safety"].map(name => ({ name, score: 1 }));
describe("Hyper XSUS Core — engine output isolation and accessor safety", () => {
  it("does not execute object getters during validation", () => {
    let reads = 0;
    const input = {};
    Object.defineProperty(input, "secret", { enumerable: true, get() { reads++; throw Error("secret"); } });
    expect(() => createStructuredOutputGuard().validate(input)).toThrow("accessor");
    expect(reads).toBe(0);
  });
  it("does not execute array getters during validation", () => {
    let reads = 0;
    const input = [1];
    Object.defineProperty(input, "0", { enumerable: true, get() { reads++; return 7; } });
    expect(() => createStructuredOutputGuard().validate(input)).toThrow("accessor");
    expect(reads).toBe(0);
  });
  it("rejects malicious input before invoking the engine", async () => {
    let reads = 0, calls = 0;
    const payload = {};
    Object.defineProperty(payload, "unsafe", { enumerable: true, get() { reads++; return 1; } });
    const coordinator = createSpecializedEngineCoordinator({ engines: [
      { name: "worker", execute: async () => { calls++; return {}; } }
    ] });
    await expect(coordinator.coordinate({ requests: [
      { engine: "worker", payload }
    ] })).rejects.toThrow("accessor");
    expect(reads).toBe(0);
    expect(calls).toBe(0);
  });
  it("marks a malicious specialist output as failed without executing getters", async () => {
    let reads = 0;
    const output = {};
    Object.defineProperty(output, "unsafe", { enumerable: true, get() { reads++; return 1; } });
    const coordinator = createSpecializedEngineCoordinator({ engines: [
      { name: "worker", execute: async () => output }
    ] });
    const result = await coordinator.coordinate({ requests: [
      { engine: "worker", payload: {} }
    ] });
    expect(result).toMatchObject({ completed: 0, failed: 1 });
    expect(result.results[0]).toMatchObject({ status: "failed", output: null });
    expect(reads).toBe(0);
  });
  it("rejects unsafe prototype keys", () => {
    const input = JSON.parse('{"__proto__":{"polluted":true}}');
    expect(() => createStructuredOutputGuard().validate(input)).toThrow("Unsafe");
    expect({}.polluted).toBeUndefined();
  });
  it("preserves safe immutable structured outputs", () => {
    const input = { nested: [{ ok: true }] };
    const result = createStructuredOutputGuard().validate(input);
    input.nested[0].ok = false;
    expect(result.nested[0].ok).toBe(true);
    expect(Object.isFrozen(result.nested[0])).toBe(true);
  });
  it("degrades a full workflow when a specialist emits unsafe output", async () => {
    let reads = 0;
    const workflow = createFiveEngineWorkflow({ engines: [
      { name: "worker", execute: async () => {
        const output = {};
        Object.defineProperty(output, "danger", { enumerable: true, get() { reads++; return 1; } });
        return output;
      } }
    ] });
    const result = await workflow.run({
      query: "alpha", requests: [{ engine: "worker", payload: {} }], qualityChecks: checks
    });
    expect(result.status).toBe("degraded");
    expect(result.coordination.failed).toBe(1);
    expect(reads).toBe(0);
  });
});
