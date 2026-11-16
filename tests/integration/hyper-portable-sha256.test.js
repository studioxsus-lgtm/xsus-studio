import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { sha256Hex } from "../../src/hyper-xsus-core/knowledge-graph/portable-sha256.js";
import {
  createKnowledgeChangeEvidenceLedger,
  restoreKnowledgeChangeEvidenceLedger
} from "../../src/hyper-xsus-core/knowledge-graph/knowledge-change-evidence-ledger.js";

describe("Hyper XSUS Core — portable SHA-256", () => {
  it.each([
    ["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
    ["abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
    ["The quick brown fox jumps over the lazy dog",
      "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592"]
  ])("matches official SHA-256 vectors", (input, expected) => {
    expect(sha256Hex(input)).toBe(expected);
  });

  it("matches Node crypto for UTF-8, emoji and multi-block messages", () => {
    for (const input of ["Shqip: çë 🇦🇱", "🙂".repeat(100), "a".repeat(1000), "x".repeat(63), "x".repeat(64)]) {
      expect(sha256Hex(input)).toBe(createHash("sha256").update(input, "utf8").digest("hex"));
    }
  });

  it("keeps ledger hashes compatible with standard Node SHA-256", () => {
    const ledger = createKnowledgeChangeEvidenceLedger();
    const record = ledger.append({
      proposalId: "p", actorId: "a", action: "proposed", timestamp: 1, details: { text: "çë" }
    });
    const body = {
      sequence: record.sequence, previousHash: record.previousHash, event: record.event
    };
    // Ledger hashes canonical JSON with recursively sorted object keys.
    // Ordinary JSON.stringify(body) retains insertion order and is not the
    // same byte sequence as the ledger's canonical serialization.
    const canonical = (value) => {
      if (Array.isArray(value)) return value.map(canonical);
      if (value !== null && typeof value === "object") {
        return Object.fromEntries(
          Object.keys(value).sort().map(key => [key, canonical(value[key])])
        );
      }
      return value;
    };
    const expected = createHash("sha256")
      .update(JSON.stringify(canonical(body)), "utf8")
      .digest("hex");
    expect(record.hash).toBe(expected);
    expect(restoreKnowledgeChangeEvidenceLedger(ledger.exportSnapshot()).verify().valid).toBe(true);
  });
});
