import { describe, expect, it } from "vitest";
import { createFiveEngineExecutionSupervisor } from "../../src/hyper-xsus-core/cross-cutting/five-engine-execution-supervisor.js";
import { createFiveEngineWorkflow } from "../../src/hyper-xsus-core/cross-cutting/five-engine-workflow.js";
const checks = ["coherence","completeness","safety"].map(name => ({ name, score: 1 }));
const input = { query: "private-query", qualityChecks: checks, requests: [{ engine: "worker", payload: {} }] };
function deferred() {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
}
function supervisor(execute, maxConcurrent = 3) {
  return createFiveEngineExecutionSupervisor({
    maxConcurrent,
    workflow: createFiveEngineWorkflow({ engines: [{ name: "worker", execute }] })
  });
}
describe("Hyper XSUS Core — supervised concurrent execution stress", () => {
  it("admits exactly the configured number of concurrent workflows", async () => {
    const hold = deferred();
    let invoked = 0;
    const s = supervisor(async () => { invoked++; await hold.promise; return { ok: true }; }, 3);
    const running = Array.from({ length: 3 }, () => s.run(input));
    const overflow = await Promise.allSettled(Array.from({ length: 25 }, () => s.run(input)));
    expect(overflow.every(r => r.status === "rejected" &&
      r.reason.code === "HYPER_WORKFLOW_CAPACITY_EXCEEDED")).toBe(true);
    expect(s.stats()).toMatchObject({ active: 3, accepted: 3, rejected: 25 });
    hold.resolve();
    const results = await Promise.all(running);
    expect(results.every(r => r.result.status === "completed")).toBe(true);
    expect(invoked).toBe(3);
    expect(s.stats()).toMatchObject({ active: 0, verified: 3, failed: 25 });
  });
  it("releases all capacity after mixed specialist successes and failures", async () => {
    let count = 0;
    const s = supervisor(async () => {
      count++;
      if (count % 2 === 0) throw Error("private-error");
      return { ok: true };
    }, 4);
    for (let i = 0; i < 40; i++) {
      const result = await s.run(input);
      expect(["completed","degraded"]).toContain(result.result.status);
    }
    expect(s.stats()).toMatchObject({
      active: 0, accepted: 40, verified: 40, failed: 0, retriesPerformed: 0
    });
    expect(count).toBe(40);
  });
  it("does not leak private errors in diagnostics under repeated failures", async () => {
    const s = supervisor(async () => { throw Error("SECRET-DO-NOT-EXPOSE"); });
    const outputs = [];
    for (let i = 0; i < 20; i++) outputs.push(await s.run(input));
    expect(outputs.every(o => o.result.status === "degraded")).toBe(true);
    expect(JSON.stringify(outputs.map(o => o.diagnostics))).not.toContain("SECRET-DO-NOT-EXPOSE");
    expect(JSON.stringify(s.stats())).not.toContain("private-query");
    expect(s.stats()).toMatchObject({ active: 0, verified: 20, failed: 0 });
  });
  it("rejects malformed requests before invoking any specialized engine", async () => {
    let calls = 0;
    const s = supervisor(async () => { calls++; return {}; });
    const attempts = Array.from({ length: 30 }, (_, i) => s.run({
      ...input, requests: Array.from({ length: 17 + i }, () => ({ engine: "worker", payload: {} }))
    }));
    const results = await Promise.allSettled(attempts);
    expect(results.every(r => r.status === "rejected")).toBe(true);
    expect(calls).toBe(0);
    expect(s.stats()).toMatchObject({ active: 0, accepted: 0, failed: 30 });
  });
  it("reuses released capacity after a rejected burst", async () => {
    const hold = deferred();
    const s = supervisor(async () => { await hold.promise; return { ok: true }; }, 1);
    const first = s.run(input);
    const denied = await Promise.allSettled(Array.from({ length: 12 }, () => s.run(input)));
    expect(denied.every(r => r.status === "rejected")).toBe(true);
    hold.resolve();
    await first;
    const next = await s.run(input);
    expect(next.result.status).toBe("completed");
    expect(s.stats()).toMatchObject({ active: 0, verified: 2, rejected: 12 });
  });
});
