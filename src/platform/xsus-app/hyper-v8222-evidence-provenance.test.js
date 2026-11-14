import { describe, expect, it } from "vitest";
import { createHyperEvidenceProvenance as create } from "./hyper-v8222-evidence-provenance.js";

const key = Buffer.alloc(32, 7);
const evidence = () => ({
  observationId: "obs_1", serviceId: "srv_example",
  snapshot: {
    instanceId: "instance-one", processId: 101,
    startedAt: "2026-11-14T10:00:00Z",
    observedAt: "2026-11-14T10:01:00Z",
    source: "local-process-observation"
  }
});

describe("Hyper v8.2.22 evidence provenance", () => {
  it("requires strong key material", () => {
    expect(() => create({ key: Buffer.alloc(4), keyId: "key1" })).toThrow();
  });
  it("signs and verifies with the same key", () => {
    const signer = create({ key, keyId: "key1" });
    const envelope = signer.sign(evidence());
    expect(signer.verify(evidence(), envelope).verified).toBe(true);
    expect(signer.verify(evidence(), envelope).runtimeAttested).toBe(false);
  });
  it("detects modified evidence", () => {
    const signer = create({ key, keyId: "key1" });
    const envelope = signer.sign(evidence());
    const changed = evidence(); changed.snapshot.processId = 999;
    expect(signer.verify(changed, envelope).verified).toBe(false);
  });
  it("rejects signatures from another key", () => {
    const signer = create({ key, keyId: "key1" });
    const other = create({ key: Buffer.alloc(32, 8), keyId: "key1" });
    expect(other.verify(evidence(), signer.sign(evidence())).verified).toBe(false);
  });
  it("rejects wrong key identifiers", () => {
    const signer = create({ key, keyId: "key1" });
    const other = create({ key, keyId: "key2" });
    expect(other.verify(evidence(), signer.sign(evidence())).verified).toBe(false);
  });
  it("rejects malformed envelopes without leaking keys", () => {
    const signer = create({ key, keyId: "key1" });
    expect(signer.verify(evidence(), { authenticationTag: "bad" }).verified).toBe(false);
    expect(JSON.stringify(signer)).not.toContain(key.toString("hex"));
  });
});
