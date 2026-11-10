import { describe, it, expect } from "vitest";
import {
  PRIVATE_LIVE_REQUIRED_CHECKS,
  evaluatePrivateLiveReadiness
} from "../../assets/js/xsus-ai/adapters/xsus-private-live-readiness.js";

describe("XSUS AI V3 private live readiness (read-only)", () => {
  it("fails closed with no supplied evidence", () => {
    const result = evaluatePrivateLiveReadiness();
    expect(result.ready).toBe(false);
    expect(result.missing).toEqual([...PRIVATE_LIVE_REQUIRED_CHECKS]);
    expect(result.activationPerformed).toBe(false);
  });
  it("does not confuse previous SQL and Actions success with real live verification", () => {
    const result = evaluatePrivateLiveReadiness({
      supabase_rls_six_pass: true,
      frontend_actions_green: true,
      backend_actions_green: true
    });
    expect(result.ready).toBe(false);
    expect(result.missing).toContain("refresh_restores_both_roles");
    expect(result.missing).toContain("authenticated_user_round_trip");
  });
  it("requires an explicit true for every check", () => {
    const evidence = Object.fromEntries(PRIVATE_LIVE_REQUIRED_CHECKS.map(key => [key, true]));
    evidence.second_account_isolation = "true";
    expect(evaluatePrivateLiveReadiness(evidence).ready).toBe(false);
  });
  it("passes only when all independent checks are confirmed", () => {
    const evidence = Object.fromEntries(PRIVATE_LIVE_REQUIRED_CHECKS.map(key => [key, true]));
    const result = evaluatePrivateLiveReadiness(evidence);
    expect(result.ready).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.activationPerformed).toBe(false);
    expect(Object.isFrozen(result)).toBe(true);
  });
  it("rejects invalid evidence input", () => {
    expect(() => evaluatePrivateLiveReadiness(null)).toThrow(TypeError);
    expect(() => evaluatePrivateLiveReadiness([])).toThrow(TypeError);
  });
});
