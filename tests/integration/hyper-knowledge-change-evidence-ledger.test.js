import { describe, expect, it } from "vitest";
import {
  createKnowledgeChangeEvidenceLedger,
  restoreKnowledgeChangeEvidenceLedger,
  verifyKnowledgeChangeEvidence
} from "../../src/hyper-xsus-core/knowledge-graph/knowledge-change-evidence-ledger.js";

const event = (action, timestamp, details = {}) => ({
  proposalId: "change-1", actorId: "reviewer", action, timestamp, details
});

describe("Hyper XSUS Core — change evidence ledger", () => {
  it("creates a deterministic, linked, immutable evidence chain", () => {
    const ledger = createKnowledgeChangeEvidenceLedger();
    const first = ledger.append(event("proposed", 1, { scope: "graph" }));
    const second = ledger.append(event("approved", 2));
    expect(first.sequence).toBe(1);
    expect(second.sequence).toBe(2);
    expect(second.previousHash).toBe(first.hash);
    expect(first.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(second.event.details)).toBe(true);
    expect(ledger.verify()).toEqual({ valid: true, count: 2, headHash: second.hash });
  });

  it("restores verified snapshots and continues the same chain", () => {
    const ledger = createKnowledgeChangeEvidenceLedger();
    ledger.append(event("proposed", 1));
    const snapshot = ledger.exportSnapshot();
    const recovered = restoreKnowledgeChangeEvidenceLedger(snapshot);
    expect(recovered.verify().valid).toBe(true);
    expect(recovered.headHash).toBe(ledger.headHash);
    const next = recovered.append(event("approved", 2));
    expect(next.previousHash).toBe(snapshot.headHash);
    expect(next.sequence).toBe(2);
  });

  it("detects modified events and rejects corrupt recovery", () => {
    const ledger = createKnowledgeChangeEvidenceLedger();
    ledger.append(event("proposed", 1));
    const snapshot = ledger.exportSnapshot();
    const tampered = JSON.parse(JSON.stringify(snapshot));
    tampered.records[0].event.details = { injected: true };
    expect(verifyKnowledgeChangeEvidence(tampered.records).valid).toBe(false);
    expect(() => restoreKnowledgeChangeEvidenceLedger(tampered)).toThrow("recovery failed");
  });

  it("detects truncated chains when trusted head is retained", () => {
    const ledger = createKnowledgeChangeEvidenceLedger();
    ledger.append(event("proposed", 1));
    ledger.append(event("approved", 2));
    const snapshot = ledger.exportSnapshot();
    const truncated = { ...snapshot, records: snapshot.records.slice(0, 1) };
    expect(verifyKnowledgeChangeEvidence(truncated.records, {
      expectedHeadHash: snapshot.headHash
    }).error).toBe("HEAD_MISMATCH");
    expect(() => restoreKnowledgeChangeEvidenceLedger(truncated)).toThrow("recovery failed");
  });

  it("filters events by proposal and enforces bounded capacity", () => {
    const ledger = createKnowledgeChangeEvidenceLedger({ maxRecords: 2 });
    ledger.append(event("proposed", 1));
    ledger.append({ ...event("approved", 2), proposalId: "change-2" });
    expect(ledger.list({ proposalId: "change-1" })).toHaveLength(1);
    expect(ledger.list({ limit: 1 })[0].event.proposalId).toBe("change-2");
    expect(() => ledger.append(event("executed", 3))).toThrow("capacity");
    expect(ledger.verify().valid).toBe(true);
  });

  it("rejects duplicate events without modifying ledger state", () => {
    const ledger = createKnowledgeChangeEvidenceLedger();
    ledger.append(event("proposed", 1));
    const head = ledger.headHash;
    expect(() => ledger.append(event("proposed", 1))).toThrow("Duplicate");
    expect(ledger.count).toBe(1);
    expect(ledger.headHash).toBe(head);
  });

  it("rejects unsupported actions, invalid timestamps and unsafe payloads", () => {
    const ledger = createKnowledgeChangeEvidenceLedger();
    expect(() => ledger.append(event("deleted", 1))).toThrow("Unsupported");
    expect(() => ledger.append(event("proposed", -1))).toThrow("timestamp");
    expect(() => ledger.append(event("proposed", 1, { value: undefined }))).toThrow("JSON-compatible");
    expect(() => ledger.append(event("proposed", 1, { value: Infinity }))).toThrow("JSON-compatible");
    expect(ledger.count).toBe(0);
  });

  it("rejects invalid capacity and forged snapshots", () => {
    expect(() => createKnowledgeChangeEvidenceLedger({ maxRecords: 0 })).toThrow("maxRecords");
    expect(() => restoreKnowledgeChangeEvidenceLedger({ version: "wrong", records: [], headHash: "" }))
      .toThrow("Invalid");
    expect(() => createKnowledgeChangeEvidenceLedger({ initialRecords: [{ sequence: 1 }] }))
      .toThrow("recovery failed");
  });
});
