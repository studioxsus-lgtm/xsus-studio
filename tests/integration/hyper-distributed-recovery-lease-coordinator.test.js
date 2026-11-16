import { describe, expect, it } from "vitest";
import { createDistributedRecoveryLeaseCoordinator } from "../../src/hyper-xsus-core/knowledge-graph/distributed-recovery-lease-coordinator.js";
function fixture() {
  const db = new Map();
  let time = 1000;
  const storage = {
    async read(key) { return db.has(key) ? structuredClone(db.get(key)) : null; },
    async compareAndSwap(key, revision, next) {
      if ((db.get(key)?.revision ?? 0) !== revision) return false;
      db.set(key, structuredClone(next)); return true;
    }
  };
  const coordinator = () => createDistributedRecoveryLeaseCoordinator({
    storage, key: "graph", clock: () => time, leaseMs: 1000
  });
  return { coordinator, setTime(t) { time = t; }, db };
}
describe("Hyper XSUS Core — distributed recovery lease coordinator", () => {
  it("grants a single owner across competing instances", async () => {
    const f = fixture();
    const a = f.coordinator(), b = f.coordinator();
    const results = await Promise.all([a.acquire("worker-a"), b.acquire("worker-b")]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect((await a.inspect()).fencingToken).toBe(1);
  });
  it("renews a live lease and rejects other owners", async () => {
    const f = fixture(), a = f.coordinator();
    const lease = await a.acquire("worker-a");
    f.setTime(1500);
    expect(await a.renew("worker-b", lease.fencingToken)).toBeNull();
    expect((await a.renew("worker-a", lease.fencingToken)).expiresAt).toBe(2500);
  });
  it("expires leases and rejects stale fencing tokens", async () => {
    const f = fixture(), a = f.coordinator();
    const first = await a.acquire("worker-a");
    f.setTime(2000);
    const second = await f.coordinator().acquire("worker-b");
    expect(second.fencingToken).toBeGreaterThan(first.fencingToken);
    expect(await a.renew("worker-a", first.fencingToken)).toBeNull();
    expect(await a.release("worker-a", first.fencingToken)).toBe(false);
  });
  it("releases leases and preserves monotonic fencing numbers", async () => {
    const f = fixture(), a = f.coordinator();
    const first = await a.acquire("worker-a");
    expect(await a.release("worker-a", first.fencingToken)).toBe(true);
    const second = await a.acquire("worker-b");
    expect(second.fencingToken).toBe(2);
  });
  it("rejects malformed persisted leases", async () => {
    const f = fixture();
    f.db.set("graph", { revision: 1, fencingToken: -1, owner: "worker", expiresAt: 100 });
    await expect(f.coordinator().inspect()).rejects.toThrow("Invalid persisted");
  });
  it("validates configuration, owners and timestamps", async () => {
    expect(() => createDistributedRecoveryLeaseCoordinator()).toThrow("configuration");
    const f = fixture(), a = f.coordinator();
    await expect(a.acquire("../unsafe")).rejects.toThrow("owner");
    f.setTime(-1);
    await expect(a.acquire("worker")).rejects.toThrow("timestamp");
  });
});
