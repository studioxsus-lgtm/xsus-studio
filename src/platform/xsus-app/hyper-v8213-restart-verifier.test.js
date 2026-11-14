import { describe, it, expect } from "vitest";
import { verifyHyperRuntimeRestart as verify } from "./hyper-v8213-restart-verifier.js";

const deploymentEvent = {
  provider: "render", authenticated: true,
  eventKind: "deployment-transition"
};
const runtimeEvidence = {
  source: "trusted-runtime-lifecycle", authenticated: true,
  beforeProcessId: "process_before", afterProcessId: "process_after"
};

describe("Hyper v8.2.13 restart policy", () => {
  it("fails closed with no evidence", () => {
    expect(verify().verified).toBe(false);
  });
  it("does not equate deployment history with restart proof", () => {
    const result = verify({ deploymentEvent });
    expect(result.blockers).toContain("INDEPENDENT_RUNTIME_RESTART_PROOF_MISSING");
  });
  it("rejects unchanged process identity", () => {
    const result = verify({ deploymentEvent, runtimeEvidence: {
      ...runtimeEvidence, afterProcessId: "process_before"
    } });
    expect(result.blockers).toContain("INDEPENDENT_RUNTIME_RESTART_PROOF_MISSING");
  });
  it("rejects unauthenticated runtime evidence", () => {
    const result = verify({ deploymentEvent, runtimeEvidence: {
      ...runtimeEvidence, authenticated: false
    } });
    expect(result.verified).toBe(false);
  });
  it("keeps production blocked even for internally consistent fixtures", () => {
    const result = verify({ deploymentEvent, runtimeEvidence });
    expect(result.verified).toBe(false);
    expect(result.blockers).toContain("RUNTIME_PROVIDER_NOT_IMPLEMENTED");
  });
});
