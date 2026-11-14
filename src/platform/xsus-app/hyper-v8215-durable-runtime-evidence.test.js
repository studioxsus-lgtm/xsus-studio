import { describe, expect, it, vi } from "vitest";
import { createHyperDurableRuntimeEvidence as create } from "./hyper-v8215-durable-runtime-evidence.js";

const before = {
  observationId: "observation_before", processId: 123,
  instanceId: "instance-before", startedAt: "2026-11-14T10:00:00Z",
  observedAt: "2026-11-14T10:01:00Z",
  source: "local-process-observation"
};
const after = {
  observationId: "observation_after", processId: 123,
  instanceId: "instance-after", startedAt: "2026-11-14T10:02:00Z",
  observedAt: "2026-11-14T10:03:00Z",
  source: "local-process-observation"
};
const setup = (a = before, b = after) => create({
  readBefore: vi.fn(async () => a), readAfter: vi.fn(async () => b),
  expectedBeforeId: "observation_before", expectedAfterId: "observation_after"
});

describe("Hyper v8.2.15 durable runtime evidence", () => {
  it("rejects missing readers", () => {
    expect(() => create()).toThrow();
  });
  it("rejects duplicate expected IDs", () => {
    expect(() => create({
      readBefore: async () => before, readAfter: async () => after,
      expectedBeforeId: "same", expectedAfterId: "same"
    })).toThrow();
  });
  it("does not claim verified provenance for matching observations", async () => {
    const result = await setup().inspect();
    expect(result.verified).toBe(false);
    expect(result.blockers).toContain("DURABLE_STORE_ATTESTATION_NOT_IMPLEMENTED");
  });
  it("detects mismatched observation ID", async () => {
    const result = await setup({ ...before, observationId: "other" }).inspect();
    expect(result.blockers).toContain("DURABLE_OBSERVATION_ID_MISMATCH");
  });
  it("detects same process instance", async () => {
    const result = await setup(before, { ...after, instanceId: before.instanceId }).inspect();
    expect(result.blockers).toContain("SAME_RUNTIME_INSTANCE");
  });
  it("fails closed on reader error without leaking error details", async () => {
    const verifier = create({
      readBefore: async () => { throw Error("secret"); },
      readAfter: async () => after,
      expectedBeforeId: "observation_before", expectedAfterId: "observation_after"
    });
    const result = await verifier.inspect();
    expect(result.blockers).toContain("DURABLE_RUNTIME_READ_FAILED");
    expect(JSON.stringify(result)).not.toContain("secret");
  });
});
