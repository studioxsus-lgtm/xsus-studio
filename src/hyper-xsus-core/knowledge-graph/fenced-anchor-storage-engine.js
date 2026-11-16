/**
 * Hyper XSUS Core — Fenced Anchor Storage Engine v1.0.0
 * Server-side atomic head and fencing-token CAS.
 * Storage MUST implement linearizable read and compareAndSwap on the same key.
 * A stale token can never change a trusted head, even after lease expiry.
 */
export const FENCED_ANCHOR_STORAGE_VERSION = "1.0.0";
const HASH = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const GENESIS = "0".repeat(64);
const freeze = x => Object.freeze(x);
export function createFencedAnchorStorageEngine({ storage } = {}) {
  if (!storage || typeof storage.read !== "function" ||
      typeof storage.compareAndSwap !== "function") {
    throw new TypeError("Fenced anchor requires atomic read and compareAndSwap.");
  }
  async function inspect(key) {
    if (typeof key !== "string" || !ID.test(key)) throw new TypeError("Invalid anchor key.");
    const value = await storage.read(key);
    if (value === null) return freeze({ revision: 0, headHash: GENESIS, fencingToken: 0 });
    if (!value || !Number.isSafeInteger(value.revision) || value.revision < 1 ||
        typeof value.headHash !== "string" || !HASH.test(value.headHash) ||
        !Number.isSafeInteger(value.fencingToken) || value.fencingToken < 1) {
      throw new Error("Invalid persisted fenced anchor.");
    }
    return freeze({ revision: value.revision, headHash: value.headHash,
      fencingToken: value.fencingToken });
  }
  async function compareAndSwap({ key, expectedHead, nextHead, fencingToken } = {}) {
    if (typeof key !== "string" || !ID.test(key) ||
        typeof expectedHead !== "string" || !HASH.test(expectedHead) ||
        typeof nextHead !== "string" || !HASH.test(nextHead) ||
        !Number.isSafeInteger(fencingToken) || fencingToken < 1) {
      throw new TypeError("Invalid fenced anchor update.");
    }
    if (expectedHead === nextHead) return false;
    const current = await inspect(key);
    if (current.headHash !== expectedHead || fencingToken <= current.fencingToken ||
        current.revision >= Number.MAX_SAFE_INTEGER) return false;
    return await storage.compareAndSwap(key, current.revision, {
      revision: current.revision + 1, headHash: nextHead, fencingToken
    }) === true;
  }
  return freeze({ version: FENCED_ANCHOR_STORAGE_VERSION, inspect, compareAndSwap });
}
