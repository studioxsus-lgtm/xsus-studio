import { describe, expect, it } from "vitest";
import { parseHyperApplicationResponse } from "./xsus-hyper-application-contract.js";
const projectId = "33333333-3333-4333-8333-333333333333";
const artifactId = "44444444-4444-4444-8444-444444444444";
const context = { operation: "application.build", projectId };
const result = { ok: true, contractVersion: "1.0.0",
  operation: "application.build", projectId,
  requestId: "build_1", status: "completed", artifactId };
describe("XSUS App build artifact response contract", () => {
  it("keeps the validated artifact reference internal until the public contract is approved", () => {
    expect(parseHyperApplicationResponse(result, context)).not.toHaveProperty("artifactId");
  });
  it("rejects a malformed artifact reference", () => {
    expect(() => parseHyperApplicationResponse({
      ...result, artifactId: "../unsafe"
    }, context)).toThrow("Invalid Hyper application response.");
  });
  it("does not inject artifact references into planning responses", () => {
    const plan = parseHyperApplicationResponse({
      ...result, operation: "application.plan"
    }, { operation: "application.plan", projectId });
    expect(plan).not.toHaveProperty("artifactId");
  });
});
