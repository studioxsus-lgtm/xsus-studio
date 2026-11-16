import { describe, expect, it } from "vitest";
import { createFencedAnchorStorageEngine } from "../../src/hyper-xsus-core/knowledge-graph/fenced-anchor-storage-engine.js";
const G = "0".repeat(64), A = "a".repeat(64), B = "b".repeat(64);
function storage() {
  const data = new Map();
  return {
    data,
    async read(key) { return data.has(key) ? structuredClone(data.get(key)) : null; },
    async compareAndSwap(key, revision, next) {
      if ((data.get(key)?.revision ?? 0) !== revision) return false;
      data.set(key, structuredClone(next)); return true;
    }
  };
}
describe("Hyper XSUS Core — fenced anchor storage", () => {
  it("initializes genesis and advances with a valid token", async () => {
    const anchor = createFencedAnchorStorageEngine({ storage: storage() });
    expect((await anchor.inspect("graph")).headHash).toBe(G);
    expect(await anchor.compareAndSwap({ key: "graph", expectedHead: G,
      nextHead: A, fencingToken: 1 })).toBe(true);
    expect(await anchor.inspect("graph")).toMatchObject({
      revision: 1, headHash: A, fencingToken: 1
    });
  });
  it("rejects stale and equal fencing tokens", async () => {
    const anchor = createFencedAnchorStorageEngine({ storage: storage() });
    await anchor.compareAndSwap({ key: "graph", expectedHead: G, nextHead: A, fencingToken: 3 });
    expect(await anchor.compareAndSwap({
      key: "graph", expectedHead: A, nextHead: B, fencingToken: 2
    })).toBe(false);
    expect(await anchor.compareAndSwap({
      key: "graph", expectedHead: A, nextHead: B, fencingToken: 3
    })).toBe(false);
    expect((await anchor.inspect("graph")).headHash).toBe(A);
  });
  it("rejects incorrect expected head", async () => {
    const anchor = createFencedAnchorStorageEngine({ storage: storage() });
    expect(await anchor.compareAndSwap({
      key: "graph", expectedHead: A, nextHead: B, fencingToken: 1
    })).toBe(false);
  });
  it("only allows one of two simultaneous writers", async () => {
    const anchor = createFencedAnchorStorageEngine({ storage: storage() });
    const results = await Promise.all([
      anchor.compareAndSwap({ key: "graph", expectedHead: G, nextHead: A, fencingToken: 1 }),
      anchor.compareAndSwap({ key: "graph", expectedHead: G, nextHead: B, fencingToken: 2 })
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });
  it("rejects corrupt storage and invalid input", async () => {
    const db = storage();
    db.data.set("graph", { revision: 1, headHash: "bad", fencingToken: 1 });
    const anchor = createFencedAnchorStorageEngine({ storage: db });
    await expect(anchor.inspect("graph")).rejects.toThrow("Invalid persisted");
    await expect(anchor.compareAndSwap({
      key: "../bad", expectedHead: G, nextHead: A, fencingToken: 1
    })).rejects.toThrow("Invalid fenced");
  });
});
