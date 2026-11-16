import { describe, it, expect } from "vitest";
import { createRequestReplayGuard } from "../../src/hyper-xsus-core/cross-cutting/request-replay-guard.js";
describe("Hyper Core replay guard", () => {
  it("blocks repeats per actor and permits other actors", () => {
    const g = createRequestReplayGuard({ clock: () => 0 });
    expect(g.claim({ actorId: "alice", requestId: "r1" })).toBe(true);
    expect(g.claim({ actorId: "alice", requestId: "r1" })).toBe(false);
    expect(g.claim({ actorId: "bob", requestId: "r1" })).toBe(true);
  });
  it("expires claims after TTL", () => {
    let now = 0;
    const g = createRequestReplayGuard({ ttlMs: 10, clock: () => now });
    expect(g.claim({ actorId: "alice", requestId: "r1" })).toBe(true);
    now = 10;
    expect(g.claim({ actorId: "alice", requestId: "r1" })).toBe(true);
  });
  it("fails closed when capacity is exhausted", () => {
    const g = createRequestReplayGuard({ maxEntries: 1, clock: () => 0 });
    g.claim({ actorId: "alice", requestId: "r1" });
    expect(() => g.claim({ actorId: "alice", requestId: "r2" })).toThrow("capacity");
  });
  it("rejects malformed identifiers", () => {
    expect(() => createRequestReplayGuard().claim({ actorId: "../x", requestId: "r" }))
      .toThrow("identity");
  });
});
