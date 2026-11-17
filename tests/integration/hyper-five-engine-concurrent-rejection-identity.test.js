import { describe, expect, it } from "vitest";
import { createFiveEngineConcurrencyGate } from "../../src/hyper-xsus-core/cross-cutting/five-engine-concurrency-gate.js";
import { createFiveEngineExecutionSupervisor } from "../../src/hyper-xsus-core/cross-cutting/five-engine-execution-supervisor.js";
const input = { query: "private" };
function deferred() {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
}
describe("Hyper XSUS Core — concurrent rejection identity regression", () => {
  it("recognizes only errors actually created by its own gate", async () => {
    const hold = deferred();
    const gate = createFiveEngineConcurrencyGate({
      maxConcurrent: 1, workflow: { async run() { await hold.promise; return true; } }
    });
    const active = gate.run(input);
    let rejected;
    try { await gate.run(input); } catch (error) { rejected = error; }
    expect(gate.isCapacityRejection(rejected)).toBe(true);
    const spoof = new Error("spoof");
    spoof.code = "HYPER_WORKFLOW_CAPACITY_EXCEEDED";
    expect(gate.isCapacityRejection(spoof)).toBe(false);
    expect(gate.isCapacityRejection(null)).toBe(false);
    hold.resolve();
    await active;
    expect(gate.stats()).toMatchObject({ active: 0, accepted: 1, rejected: 1 });
  });
  it("does not misclassify a running workflow failure when another call is rejected", async () => {
    const hold = deferred();
    const s = createFiveEngineExecutionSupervisor({
      maxConcurrent: 1, workflow: { async run() {
        await hold.promise;
        throw Error("private workflow failure");
      } }
    });
    const active = s.run(input);
    const denied = s.run(input);
    hold.resolve();
    const settled = await Promise.allSettled([active, denied]);
    expect(settled.map(r => r.status)).toEqual(["rejected", "rejected"]);
    expect(s.stats()).toMatchObject({
      active: 0, accepted: 1, rejected: 1, failed: 2,
      capacityRejected: 1, executionFailed: 1
    });
  });
  it("keeps per-instance rejection identity isolated", async () => {
    const hold = deferred();
    const make = () => createFiveEngineConcurrencyGate({
      maxConcurrent: 1, workflow: { async run() { await hold.promise; return true; } }
    });
    const a = make(), b = make();
    const runningA = a.run(input), runningB = b.run(input);
    let errorA;
    try { await a.run(input); } catch (error) { errorA = error; }
    expect(a.isCapacityRejection(errorA)).toBe(true);
    expect(b.isCapacityRejection(errorA)).toBe(false);
    hold.resolve();
    await Promise.all([runningA, runningB]);
  });
  it("recovers after a concurrent burst of rejected requests", async () => {
    const hold = deferred();
    const gate = createFiveEngineConcurrencyGate({
      maxConcurrent: 1, workflow: { async run() { await hold.promise; return true; } }
    });
    const active = gate.run(input);
    const overflow = await Promise.allSettled(
      Array.from({ length: 100 }, () => gate.run(input))
    );
    expect(overflow.every(r => r.status === "rejected" &&
      gate.isCapacityRejection(r.reason))).toBe(true);
    hold.resolve();
    await active;
    expect(await gate.run(input)).toBe(true);
    expect(gate.stats()).toMatchObject({ active: 0, accepted: 2, rejected: 100 });
  });
});
