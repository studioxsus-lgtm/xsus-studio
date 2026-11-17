import { describe, it, expect } from "vitest";
import { createFiveEngineConcurrencyGate } from "../../src/hyper-xsus-core/cross-cutting/five-engine-concurrency-gate.js";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe("Hyper five-engine concurrency gate — saturation and recovery", () => {
  it("rejects overflow without queueing and releases slots on success", async () => {
    const first = deferred();
    const second = deferred();
    let called = 0;
    const gate = createFiveEngineConcurrencyGate({
      maxConcurrent: 2,
      workflow: { run: () => (++called === 1 ? first.promise : second.promise) }
    });
    const a = gate.run("a");
    const b = gate.run("b");
    expect(gate.stats()).toMatchObject({ active: 2, accepted: 2, rejected: 0 });
    let rejection;
    try { await gate.run("overflow"); } catch (error) { rejection = error; }
    expect(rejection?.code).toBe("HYPER_WORKFLOW_CAPACITY_EXCEEDED");
    expect(gate.isCapacityRejection(rejection)).toBe(true);
    expect(gate.stats()).toMatchObject({ active: 2, accepted: 2, rejected: 1 });
    expect(called).toBe(2);
    first.resolve("done-a");
    second.resolve("done-b");
    expect(await Promise.all([a, b])).toEqual(["done-a", "done-b"]);
    expect(gate.stats().active).toBe(0);
    expect(await gate.run("next")).toBe("done-b");
    expect(gate.stats()).toMatchObject({ active: 0, accepted: 3, rejected: 1 });
  });

  it("releases capacity after a workflow rejection", async () => {
    const pending = deferred();
    const gate = createFiveEngineConcurrencyGate({
      maxConcurrent: 1,
      workflow: { run: input => input === "fail" ? pending.promise : "recovered" }
    });
    const failure = gate.run("fail");
    expect(gate.stats().active).toBe(1);
    pending.reject(new Error("engine failed"));
    await expect(failure).rejects.toThrow("engine failed");
    expect(gate.stats().active).toBe(0);
    await expect(gate.run("retry")).resolves.toBe("recovered");
    expect(gate.stats()).toMatchObject({ active: 0, accepted: 2 });
  });

  it("releases capacity after synchronous workflow throws", async () => {
    const gate = createFiveEngineConcurrencyGate({
      maxConcurrent: 1,
      workflow: { run: input => {
        if (input === "fail") throw new Error("sync failure");
        return "ok";
      } }
    });
    await expect(gate.run("fail")).rejects.toThrow("sync failure");
    expect(gate.stats().active).toBe(0);
    await expect(gate.run("next")).resolves.toBe("ok");
  });

  it("rejects invalid concurrency limits", () => {
    const workflow = { run: () => "ok" };
    for (const maxConcurrent of [0, -1, 1.5, 257, NaN, Infinity]) {
      expect(() => createFiveEngineConcurrencyGate({ workflow, maxConcurrent }))
        .toThrow(TypeError);
    }
  });
});
