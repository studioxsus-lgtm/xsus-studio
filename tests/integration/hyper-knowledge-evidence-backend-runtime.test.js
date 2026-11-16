import { describe, expect, it } from "vitest";
import { createKnowledgeEvidenceBackendRuntime } from "../../src/hyper-xsus-core/knowledge-graph/knowledge-evidence-backend-runtime.js";

const GENESIS = "0".repeat(64);
function harness() {
  const records = new Map();
  const heads = new Map();
  let failWrites = false;
  let failAnchor = false;
  const client = {
    from() {
      return { select() {
        return { eq(_column, key) {
          return { async maybeSingle() {
            const value = records.get(key);
            return { data: value ? { checkpoint: structuredClone(value) } : null, error: null };
          } };
        } };
      } };
    },
    async rpc(_name, { p_key, p_expected_revision, p_checkpoint }) {
      if (failWrites) return { data: null, error: { message: "offline" } };
      if ((records.get(p_key)?.revision ?? 0) !== p_expected_revision) {
        return { data: false, error: null };
      }
      records.set(p_key, structuredClone(p_checkpoint));
      return { data: true, error: null };
    }
  };
  const anchor = {
    async read(key) { return heads.get(key) ?? null; },
    async advance(key, previous, next) {
      if (failAnchor) throw new Error("anchor unavailable");
      if ((heads.get(key) ?? GENESIS) !== previous) throw new Error("anchor conflict");
      heads.set(key, next);
    }
  };
  const runtime = (key = "graph", options = {}) =>
    createKnowledgeEvidenceBackendRuntime({ supabaseClient: client, key, anchor, ...options });
  return {
    runtime, records, heads,
    failWrites(value) { failWrites = value; },
    failAnchor(value) { failAnchor = value; }
  };
}
const event = (action, timestamp) => ({
  proposalId: "p", actorId: "reviewer", action, timestamp, details: {}
});

describe("Hyper XSUS Core — backend evidence runtime", () => {
  it("initializes empty storage and appends verifiable records", async () => {
    const h = harness();
    const service = h.runtime();
    expect(await service.initialize()).toEqual({
      revision: 0, headHash: GENESIS, recordCount: 0
    });
    const saved = await service.append(event("proposed", 1));
    expect(saved.revision).toBe(1);
    expect(saved.record.event.action).toBe("proposed");
    expect((await service.inspect()).integrity.valid).toBe(true);
    expect((await service.inspect()).recordCount).toBe(1);
  });

  it("recovers across runtime re-creation using shared durable stores", async () => {
    const h = harness();
    await h.runtime().append(event("proposed", 1));
    const restarted = h.runtime();
    expect((await restarted.initialize()).recordCount).toBe(1);
    await restarted.append(event("approved", 2));
    expect((await h.runtime().inspect()).recordCount).toBe(2);
  });

  it("serializes concurrent writes on one runtime instance", async () => {
    const h = harness();
    const service = h.runtime();
    await Promise.all([
      service.append(event("proposed", 1)),
      service.append(event("approved", 2))
    ]);
    expect((await service.inspect()).recordCount).toBe(2);
  });

  it("fails closed when the trusted anchor differs from stored history", async () => {
    const h = harness();
    await h.runtime().append(event("proposed", 1));
    h.heads.set("graph", "a".repeat(64));
    await expect(h.runtime().initialize()).rejects.toThrow("trusted head mismatch");
  });

  it("does not erase history when the anchor advance fails", async () => {
    const h = harness();
    h.failAnchor(true);
    await expect(h.runtime().append(event("proposed", 1))).rejects.toThrow("anchor unavailable");
    expect(h.records.get("graph").revision).toBe(1);
    h.failAnchor(false);
    await expect(h.runtime().initialize()).rejects.toThrow("trusted head mismatch");
  });

  it("surfaces storage errors without reporting successful persistence", async () => {
    const h = harness();
    h.failWrites(true);
    await expect(h.runtime().append(event("proposed", 1))).rejects.toThrow("compare-and-swap failed");
    expect(h.records.size).toBe(0);
  });

  it("rejects invalid dependencies and closes explicitly", async () => {
    const h = harness();
    expect(() => createKnowledgeEvidenceBackendRuntime({
      supabaseClient: {}, key: "graph", anchor: {}
    })).toThrow("trusted head anchor");
    expect(() => h.runtime("../bad")).toThrow("runtime key");
    const service = h.runtime();
    service.close();
    await expect(service.inspect()).rejects.toThrow("closed");
    await expect(service.append(event("proposed", 1))).rejects.toThrow("closed");
  });

  it("keeps tenant keys isolated", async () => {
    const h = harness();
    await h.runtime("tenant:a").append(event("proposed", 1));
    expect((await h.runtime("tenant:b").inspect()).recordCount).toBe(0);
    expect((await h.runtime("tenant:a").inspect()).recordCount).toBe(1);
  });
});
