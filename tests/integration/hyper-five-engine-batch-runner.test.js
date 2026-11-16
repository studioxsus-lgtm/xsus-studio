import { describe, expect, it } from "vitest";
import { createFiveEngineBatchRunner } from "../../src/hyper-xsus-core/cross-cutting/five-engine-batch-runner.js";
describe("Hyper XSUS Core — five-engine batch execution", () => {
  it("processes bounded requests sequentially and reports immutable counts", async () => {
    const order = [];
    const batch = createFiveEngineBatchRunner({ workflow: {
      async run(input) { order.push(input.step); return { status: "completed" }; }
    } });
    const result = await batch.run({ items: [
      { id: "first", input: { step: 1 } },
      { id: "second", input: { step: 2 } }
    ] });
    expect(order).toEqual([1, 2]);
    expect(result.counts.completed).toBe(2);
    expect(result.attempted).toBe(2);
    expect(Object.isFrozen(result.outcomes)).toBe(true);
    expect(Object.isFrozen(result.counts)).toBe(true);
  });
  it("prevalidates duplicate ids without starting any workflow", async () => {
    let calls = 0;
    const batch = createFiveEngineBatchRunner({ workflow: {
      async run() { calls++; return { status: "completed" }; }
    } });
    await expect(batch.run({ items: [
      { id: "same", input: {} }, { id: "same", input: {} }
    ] })).rejects.toThrow("batch item");
    expect(calls).toBe(0);
  });
  it("stops after quality rejection when configured", async () => {
    let calls = 0;
    const batch = createFiveEngineBatchRunner({ stopOnFailure: true, workflow: {
      async run() { calls++; return { status: "quality-rejected" }; }
    } });
    const result = await batch.run({ items: [
      { id: "a", input: {} }, { id: "b", input: {} }
    ] });
    expect(calls).toBe(1);
    expect(result.counts["quality-rejected"]).toBe(1);
    expect(result.counts.skipped).toBe(1);
    expect(result.stoppedEarly).toBe(true);
  });
  it("continues after exceptions by default without exposing private messages", async () => {
    let calls = 0;
    const batch = createFiveEngineBatchRunner({ workflow: {
      async run() { calls++; if (calls === 1) throw Error("private-token"); return { status: "completed" }; }
    } });
    const result = await batch.run({ items: [
      { id: "a", input: {} }, { id: "b", input: {} }
    ] });
    expect(result.counts).toMatchObject({ failed: 1, completed: 1 });
    expect(result.outcomes[0].errorCode).toBe("WORKFLOW_FAILED");
    expect(JSON.stringify(result)).not.toContain("private-token");
    expect(result.retryPerformed).toBe(false);
  });
  it("rejects over-limit batches without execution", async () => {
    let calls = 0;
    const batch = createFiveEngineBatchRunner({ maxItems: 1, workflow: {
      async run() { calls++; return { status: "completed" }; }
    } });
    await expect(batch.run({ items: [
      { id: "a", input: {} }, { id: "b", input: {} }
    ] })).rejects.toThrow("batch items");
    expect(calls).toBe(0);
  });
  it("rejects malformed configuration and unsupported workflow status", async () => {
    expect(() => createFiveEngineBatchRunner({ workflow: {} })).toThrow("configuration");
    const batch = createFiveEngineBatchRunner({ workflow: {
      async run() { return { status: "invented" }; }
    } });
    const result = await batch.run({ items: [{ id: "a", input: {} }] });
    expect(result.counts.failed).toBe(1);
  });
});
