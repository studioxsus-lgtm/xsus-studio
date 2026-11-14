import { describe, expect, it } from "vitest";
import { prepareHyperAtomicBundle, parseHyperAtomicBundle } from "./hyper-v8224-atomic-bundle-contract.js";
const row = () => ({
  observation_id: "obs_1", service_id: "srv_example",
  instance_id: "instance-one", process_id: 101,
  started_at: "2026-11-14T10:00:00Z",
  observed_at: "2026-11-14T10:01:00Z",
  source: "local-process-observation"
});
const envelope = () => ({
  version: 1, algorithm: "HMAC-SHA256", keyId: "key1",
  evidenceDigest: "a".repeat(64), authenticationTag: "b".repeat(64)
});
describe("Hyper v8.2.24 atomic bundle contract", () => {
  it("prepares a single-row bundle", () => {
    const result = prepareHyperAtomicBundle({ row: row(), envelope: envelope() });
    expect(result.observation_id).toBe("obs_1");
    expect(result.envelope_key_id).toBe("key1");
    expect(Object.isFrozen(result)).toBe(true);
  });
  it("round trips the bundle", () => {
    const result = parseHyperAtomicBundle(prepareHyperAtomicBundle({ row: row(), envelope: envelope() }));
    expect(result.row).toEqual(row());
    expect(result.envelope).toEqual(envelope());
  });
  it("rejects unsupported algorithms", () => {
    expect(() => prepareHyperAtomicBundle({
      row: row(), envelope: { ...envelope(), algorithm: "none" }
    })).toThrow();
  });
  it("rejects malformed authentication tags", () => {
    expect(() => prepareHyperAtomicBundle({
      row: row(), envelope: { ...envelope(), authenticationTag: "invalid" }
    })).toThrow();
  });
  it("rejects invalid process identifiers", () => {
    expect(() => prepareHyperAtomicBundle({
      row: { ...row(), process_id: -1 }, envelope: envelope()
    })).toThrow();
  });
  it("rejects missing bundle fields", () => {
    expect(() => parseHyperAtomicBundle({ observation_id: "obs_1" })).toThrow();
  });
});
