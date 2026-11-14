import { describe, expect, it } from "vitest";
import {
  createHyperRuntimeLifecycle as create,
  compareHyperRuntimeSnapshots as compare
} from "./hyper-v8214-runtime-lifecycle.js";

const before = {
  processId: 100, startedAt: "2026-11-14T10:00:00Z",
  observedAt: "2026-11-14T10:01:00Z",
  instanceId: "instance-old", source: "local-process-observation"
};
const after = {
  processId: 100, startedAt: "2026-11-14T10:02:00Z",
  observedAt: "2026-11-14T10:03:00Z",
  instanceId: "instance-new", source: "local-process-observation"
};

describe("Hyper v8.2.14 runtime lifecycle", () => {
  it("captures immutable process identity", () => {
    const runtime = create({
      processId: 100, startedAt: before.startedAt,
      instanceId: before.instanceId, clock: () => before.observedAt
    });
    const snapshot = runtime.snapshot();
    expect(snapshot).toMatchObject(before);
    expect(Object.isFrozen(snapshot)).toBe(true);
  });
  it("rejects invalid process ID", () => {
    expect(() => create({ processId: 0 })).toThrow();
  });
  it("rejects repeated runtime identity", () => {
    const result = compare(before, { ...after, instanceId: before.instanceId });
    expect(result.blockers).toContain("SAME_RUNTIME_INSTANCE");
  });
  it("rejects invalid chronology", () => {
    const result = compare(before, { ...after, startedAt: before.observedAt });
    expect(result.blockers).toContain("RUNTIME_CHRONOLOGY_INVALID");
  });
  it("never treats unpersisted observations as authenticated proof", () => {
    const result = compare(before, after);
    expect(result.verified).toBe(false);
    expect(result.blockers).toContain("DURABLE_PROVENANCE_NOT_VERIFIED");
  });
});
