import { describe, expect, it } from "vitest";
import { createSupabaseEvidenceCheckpointAdapter } from "../../src/hyper-xsus-core/knowledge-graph/supabase-evidence-checkpoint-adapter.js";
import { createKnowledgeEvidenceCheckpointStore } from "../../src/hyper-xsus-core/knowledge-graph/knowledge-evidence-checkpoints.js";

function mockSupabase() {
  const records = new Map();
  let failRead = false;
  let failWrite = false;
  const client = {
    from(table) {
      expect(table).toBe("xsus_evidence_checkpoints");
      return {
        select(columns) {
          expect(columns).toBe("checkpoint");
          return {
            eq(column, key) {
              expect(column).toBe("checkpoint_key");
              return {
                async maybeSingle() {
                  if (failRead) return { data: null, error: { message: "offline" } };
                  return { data: records.has(key)
                    ? { checkpoint: structuredClone(records.get(key)) } : null, error: null };
                }
              };
            }
          };
        }
      };
    },
    async rpc(name, { p_key, p_expected_revision, p_checkpoint }) {
      expect(name).toBe("xsus_evidence_checkpoint_cas");
      if (failWrite) return { data: null, error: { message: "offline" } };
      const current = records.get(p_key);
      if ((current?.revision ?? 0) !== p_expected_revision) {
        return { data: false, error: null };
      }
      records.set(p_key, structuredClone(p_checkpoint));
      return { data: true, error: null };
    }
  };
  return {
    client, records,
    failRead(value) { failRead = value; },
    failWrite(value) { failWrite = value; }
  };
}
const genesis = "0".repeat(64);
const event = (action, timestamp) => ({
  proposalId: "p", actorId: "reviewer", action, timestamp, details: {}
});

describe("Hyper XSUS Core — Supabase evidence checkpoint adapter", () => {
  it("persists and recovers checkpoints through the existing store", async () => {
    const mock = mockSupabase();
    const adapter = createSupabaseEvidenceCheckpointAdapter({ client: mock.client });
    const first = createKnowledgeEvidenceCheckpointStore({ storage: adapter, key: "tenant:graph" });
    const state = await first.recover();
    state.ledger.append(event("proposed", 1));
    const saved = await first.commit({
      ledger: state.ledger, expectedRevision: 0, expectedHeadHash: genesis
    });
    expect(saved.revision).toBe(1);
    const restarted = createKnowledgeEvidenceCheckpointStore({ storage: adapter, key: "tenant:graph" });
    const restored = await restarted.recover({ expectedHeadHash: saved.headHash });
    expect(restored.ledger.verify().valid).toBe(true);
    expect(restored.ledger.count).toBe(1);
  });

  it("rejects competing writers and preserves the first checkpoint", async () => {
    const mock = mockSupabase();
    const adapter = createSupabaseEvidenceCheckpointAdapter({ client: mock.client });
    const a = createKnowledgeEvidenceCheckpointStore({ storage: adapter, key: "graph" });
    const b = createKnowledgeEvidenceCheckpointStore({ storage: adapter, key: "graph" });
    const sa = await a.recover();
    const sb = await b.recover();
    sa.ledger.append(event("proposed", 1));
    sb.ledger.append(event("rejected", 2));
    const saved = await a.commit({ ledger: sa.ledger, expectedRevision: 0, expectedHeadHash: genesis });
    await expect(b.commit({
      ledger: sb.ledger, expectedRevision: 0, expectedHeadHash: genesis
    })).rejects.toThrow("conflict");
    expect((await a.recover({ expectedHeadHash: saved.headHash })).ledger.count).toBe(1);
  });

  it("surfaces read errors without leaking backend error details", async () => {
    const mock = mockSupabase();
    const adapter = createSupabaseEvidenceCheckpointAdapter({ client: mock.client });
    mock.failRead(true);
    await expect(adapter.read("graph")).rejects.toThrow("read failed");
  });

  it("surfaces write errors without falsely claiming a commit", async () => {
    const mock = mockSupabase();
    const adapter = createSupabaseEvidenceCheckpointAdapter({ client: mock.client });
    mock.failWrite(true);
    await expect(adapter.compareAndSwap("graph", 0, { revision: 1 }))
      .rejects.toThrow("compare-and-swap failed");
    expect(mock.records.size).toBe(0);
  });

  it("rejects invalid keys, revisions and RPC responses", async () => {
    const mock = mockSupabase();
    const adapter = createSupabaseEvidenceCheckpointAdapter({ client: mock.client });
    await expect(adapter.read("../unsafe")).rejects.toThrow("key");
    await expect(adapter.compareAndSwap("graph", -1, { revision: 0 })).rejects.toThrow("CAS");
    await expect(adapter.compareAndSwap("graph", 1, { revision: 3 })).rejects.toThrow("CAS");
    const invalid = createSupabaseEvidenceCheckpointAdapter({
      client: { ...mock.client, rpc: async () => ({ data: { ok: true }, error: null }) }
    });
    await expect(invalid.compareAndSwap("graph", 0, { revision: 1 }))
      .rejects.toThrow("response");
  });

  it("requires the reviewed schema and an injected Supabase client", () => {
    expect(() => createSupabaseEvidenceCheckpointAdapter()).toThrow("trusted Supabase");
    const mock = mockSupabase();
    expect(() => createSupabaseEvidenceCheckpointAdapter({
      client: mock.client, tableName: "untrusted_table"
    })).toThrow("not supported");
  });

  it("returns defensive copies rather than mutable database references", async () => {
    const mock = mockSupabase();
    const adapter = createSupabaseEvidenceCheckpointAdapter({ client: mock.client });
    const input = { revision: 1, marker: { value: "safe" } };
    expect(await adapter.compareAndSwap("graph", 0, input)).toBe(true);
    input.marker.value = "mutated";
    const read = await adapter.read("graph");
    expect(read.marker.value).toBe("safe");
    read.marker.value = "changed";
    expect((await adapter.read("graph")).marker.value).toBe("safe");
  });
});
