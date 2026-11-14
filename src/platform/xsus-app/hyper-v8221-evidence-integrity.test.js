import { describe, expect, it } from "vitest";
import { digestHyperEvidence, compareHyperEvidence } from "./hyper-v8221-evidence-integrity.js";

const input = () => ({
  observationId: "obs_1", serviceId: "srv_example",
  snapshot: {
    instanceId: "instance-one", processId: 101,
    startedAt: "2026-11-14T10:00:00Z",
    observedAt: "2026-11-14T10:01:00Z",
    source: "local-process-observation"
  }
});

describe("Hyper v8.2.21 evidence integrity", () => {
  it("produces a stable SHA-256 digest", () => {
    expect(digestHyperEvidence(input())).toMatch(/^[a-f0-9]{64}$/);
    expect(digestHyperEvidence(input())).toBe(digestHyperEvidence(input()));
  });
  it("normalizes equivalent UTC timestamps", () => {
    const variant = input();
    variant.snapshot.startedAt = "2026-11-14T11:00:00+01:00";
    expect(digestHyperEvidence(variant)).toBe(digestHyperEvidence(input()));
  });
  it("detects changed process identity", () => {
    const changed = input(); changed.snapshot.processId = 102;
    expect(compareHyperEvidence(changed, digestHyperEvidence(input())).matches).toBe(false);
  });
  it("matches original evidence but never attests provenance", () => {
    const result = compareHyperEvidence(input(), digestHyperEvidence(input()));
    expect(result.matches).toBe(true);
    expect(result.provenanceVerified).toBe(false);
  });
  it("rejects malformed digests", () => {
    expect(compareHyperEvidence(input(), "invalid").matches).toBe(false);
  });
  it("rejects invalid evidence", () => {
    const changed = input(); changed.snapshot.source = "untrusted";
    expect(compareHyperEvidence(changed, digestHyperEvidence(input())).matches).toBe(false);
  });
});
