import { describe, expect, it } from "vitest";
import { createEvidenceRuntimeHealthSupervisor } from "../../src/hyper-xsus-core/knowledge-graph/evidence-runtime-health-supervisor.js";

function fixture(overrides = {}) {
  let recovery = { status: "consistent", safeToWrite: true };
  let runtime = { revision: 2, recordCount: 5, integrity: { valid: true } };
  let tick = 0;
  const supervisor = createEvidenceRuntimeHealthSupervisor({
    recoveryInspector: { async inspect() { return recovery; } },
    runtime: { async inspect() { return runtime; } },
    clock: () => ++tick, historyLimit: 2, ...overrides
  });
  return { supervisor, setRecovery(value) { recovery = value; },
    setRuntime(value) { runtime = value; } };
}
describe("Hyper XSUS Core — evidence runtime health supervisor", () => {
  it("reports ready only when recovery and runtime integrity agree", async () => {
    const f = fixture();
    expect(await f.supervisor.check()).toMatchObject({
      ready: true, status: "ready", revision: 2, recordCount: 5
    });
  });
  it("reports degraded when anchor and checkpoint diverge", async () => {
    const f = fixture();
    f.setRecovery({ status: "divergent-history", safeToWrite: false });
    expect(await f.supervisor.check()).toMatchObject({
      ready: false, status: "degraded", reason: "divergent-history"
    });
  });
  it("fails closed on invalid runtime integrity", async () => {
    const f = fixture();
    f.setRuntime({ revision: 1, recordCount: 1, integrity: { valid: false } });
    expect((await f.supervisor.check()).reason).toBe("runtime-inspection-error");
  });
  it("bounds history and returns immutable snapshots", async () => {
    const f = fixture();
    await f.supervisor.check();
    await f.supervisor.check();
    await f.supervisor.check();
    const recent = f.supervisor.recent();
    expect(recent).toHaveLength(2);
    expect(recent.map(item => item.timestamp)).toEqual([2, 3]);
    expect(Object.isFrozen(recent)).toBe(true);
    expect(Object.isFrozen(recent[0])).toBe(true);
  });
  it("handles inspection failures without leaking errors", async () => {
    const f = fixture({ recoveryInspector: { async inspect() { throw new Error("secret"); } } });
    expect(await f.supervisor.check()).toMatchObject({
      ready: false, reason: "recovery-inspection-error"
    });
  });
  it("supports closure and rejects malformed dependencies", async () => {
    expect(() => createEvidenceRuntimeHealthSupervisor()).toThrow("runtime.inspect");
    const f = fixture();
    f.supervisor.close();
    await expect(f.supervisor.check()).rejects.toThrow("closed");
  });
});
