/** In-memory, bounded request replay guard for authenticated server callers.
 * Not a distributed replay defense; use a shared atomic store for multi-instance deployment.
 */
export const REQUEST_REPLAY_GUARD_VERSION = "1.0.0";
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
export function createRequestReplayGuard({ ttlMs = 60000, maxEntries = 10000, clock = Date.now } = {}) {
  if (!Number.isSafeInteger(ttlMs) || ttlMs < 1 ||
      !Number.isSafeInteger(maxEntries) || maxEntries < 1 ||
      typeof clock !== "function") throw new TypeError("Invalid replay guard configuration.");
  const seen = new Map();
  function claim({ actorId, requestId } = {}) {
    if (typeof actorId !== "string" || !ID.test(actorId) ||
        typeof requestId !== "string" || !ID.test(requestId))
      throw new TypeError("Invalid replay guard identity.");
    const now = clock();
    if (!Number.isSafeInteger(now) || now < 0) throw new TypeError("Invalid replay guard clock.");
    for (const [key, expires] of seen) if (expires <= now) seen.delete(key);
    const key = JSON.stringify([actorId, requestId]);
    if (seen.has(key)) return false;
    if (seen.size >= maxEntries) throw new Error("Replay guard capacity reached.");
    seen.set(key, now + ttlMs);
    return true;
  }
  return Object.freeze({ version: REQUEST_REPLAY_GUARD_VERSION, claim, size: () => seen.size });
}
