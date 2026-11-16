/**
 * Hyper XSUS Core — Distributed Recovery Lease Coordinator v1.0.0
 * Atomic lease ownership for multiple backend instances. Uses a monotonic
 * fencing token and CAS revision to prevent stale holders from renewing.
 * Downstream anchor writes MUST verify the fencing token at the resource;
 * a lease by itself cannot guarantee exactly-once execution.
 */
export const DISTRIBUTED_RECOVERY_LEASE_VERSION = "1.0.0";
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const copy = x => JSON.parse(JSON.stringify(x));
const frozen = x => Object.freeze(x);
export function createDistributedRecoveryLeaseCoordinator({
  storage, key, clock = () => Date.now(), leaseMs = 30000
} = {}) {
  if (!storage || typeof storage.read !== "function" ||
      typeof storage.compareAndSwap !== "function" ||
      typeof key !== "string" || !ID.test(key) ||
      typeof clock !== "function" ||
      !Number.isSafeInteger(leaseMs) || leaseMs < 1000 || leaseMs > 3600000) {
    throw new TypeError("Invalid distributed recovery lease configuration.");
  }
  async function load() {
    const state = await storage.read(key);
    if (state === null) return {
      revision: 0, fencingToken: 0, owner: null, expiresAt: 0
    };
    if (!state || !Number.isSafeInteger(state.revision) || state.revision < 1 ||
        !Number.isSafeInteger(state.fencingToken) || state.fencingToken < 1 ||
        (state.owner !== null && (typeof state.owner !== "string" || !ID.test(state.owner))) ||
        !Number.isSafeInteger(state.expiresAt) || state.expiresAt < 0) {
      throw new Error("Invalid persisted recovery lease.");
    }
    return copy(state);
  }
  function now() {
    const t = clock();
    if (!Number.isSafeInteger(t) || t < 0 || t + leaseMs > Number.MAX_SAFE_INTEGER) {
      throw new TypeError("Invalid recovery lease timestamp.");
    }
    return t;
  }
  async function acquire(owner) {
    if (typeof owner !== "string" || !ID.test(owner)) throw new TypeError("Invalid lease owner.");
    const current = await load();
    const timestamp = now();
    if (current.owner !== null && current.expiresAt > timestamp) return null;
    if (current.fencingToken >= Number.MAX_SAFE_INTEGER) {
      throw new Error("Recovery fencing token exhausted.");
    }
    const next = {
      revision: current.revision + 1, fencingToken: current.fencingToken + 1,
      owner, expiresAt: timestamp + leaseMs
    };
    if (await storage.compareAndSwap(key, current.revision, copy(next)) !== true) return null;
    return frozen(next);
  }
  async function renew(owner, fencingToken) {
    const current = await load();
    const timestamp = now();
    if (current.owner !== owner || current.fencingToken !== fencingToken ||
        current.owner === null || current.expiresAt <= timestamp) return null;
    const next = { ...current, revision: current.revision + 1, expiresAt: timestamp + leaseMs };
    if (await storage.compareAndSwap(key, current.revision, copy(next)) !== true) return null;
    return frozen(next);
  }
  async function release(owner, fencingToken) {
    const current = await load();
    if (current.owner !== owner || current.fencingToken !== fencingToken ||
        current.owner === null) return false;
    const next = { ...current, revision: current.revision + 1, owner: null, expiresAt: 0 };
    return await storage.compareAndSwap(key, current.revision, copy(next)) === true;
  }
  async function inspect() { return frozen(await load()); }
  return frozen({ version: DISTRIBUTED_RECOVERY_LEASE_VERSION, acquire, renew, release, inspect });
}
