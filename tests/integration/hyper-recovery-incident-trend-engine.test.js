import { describe, expect, it } from "vitest";
import { createRecoveryIncidentTrendEngine } from "../../src/hyper-xsus-core/knowledge-graph/recovery-incident-trend-engine.js";
import { createRecoveryIncidentTriageEngine } from "../../src/hyper-xsus-core/knowledge-graph/recovery-incident-triage-engine.js";
const action = { critical: "quarantine-and-investigate", high: "investigate-evidence",
  medium: "manual-reconciliation-review" };
function triage(revision, items) {
  const incidents = Object.entries(items).map(([id, priority]) => ({
    id, priority, action: action[priority], automaticRecoveryAllowed: false
  })).sort((a, b) => ({ critical: 3, high: 2, medium: 1 }[b.priority] -
    { critical: 3, high: 2, medium: 1 }[a.priority] || a.id.localeCompare(b.id, "en"));
  const summary = { critical: 0, high: 0, medium: 0 };
  for (const item of incidents) summary[item.priority]++;
  return { revision, total: incidents.length, incidentCount: incidents.length,
    incidents, summary, highestPriority: incidents[0]?.priority ?? "none",
    readOnly: true, automaticRecoveryAllowed: false };
}
describe("Hyper XSUS Core — incident trend comparison", () => {
  it("classifies added, resolved, escalated, deescalated and unchanged incidents", () => {
    const engine = createRecoveryIncidentTrendEngine();
    const result = engine.compare({ scope: "graph", previous: triage(1, {
      a: "medium", b: "high", c: "critical", d: "high"
    }), current: triage(2, {
      a: "critical", b: "medium", d: "high", e: "high"
    }) });
    expect(result).toMatchObject({
      added: ["e"], resolved: ["c"], escalated: ["a"],
      deescalated: ["b"], unchanged: ["d"], requiresManualReview: true,
      automaticRecoveryAllowed: false
    });
    expect(Object.isFrozen(result.added)).toBe(true);
  });
  it("does not demand manual review for only resolved incidents", () => {
    const result = createRecoveryIncidentTrendEngine().compare({
      scope: "graph", previous: triage(1, { a: "medium" }),
      current: triage(2, {})
    });
    expect(result.resolved).toEqual(["a"]);
    expect(result.requiresManualReview).toBe(false);
  });
  it("rejects non-increasing revisions", () => {
    expect(() => createRecoveryIncidentTrendEngine().compare({
      scope: "graph", previous: triage(2, {}), current: triage(2, {})
    })).toThrow("increasing revisions");
  });
  it("rejects forged summaries", () => {
    const old = triage(1, { a: "high" });
    old.summary.high = 0;
    expect(() => createRecoveryIncidentTrendEngine().compare({
      scope: "graph", previous: old, current: triage(2, {})
    })).toThrow("Invalid");
  });
  it("rejects duplicate incident IDs", () => {
    const old = triage(1, { a: "medium", b: "high" });
    old.incidents[1].id = old.incidents[0].id;
    expect(() => createRecoveryIncidentTrendEngine().compare({
      scope: "graph", previous: old, current: triage(2, {})
    })).toThrow("Invalid");
  });
  it("rejects invalid scope and configuration", () => {
    expect(() => createRecoveryIncidentTrendEngine({ maxIncidents: 0 })).toThrow("configuration");
    expect(() => createRecoveryIncidentTrendEngine().compare({
      scope: "../other", previous: triage(1, {}), current: triage(2, {})
    })).toThrow("Invalid");
  });
  it("rejects incidents exceeding the configured limit", () => {
    expect(() => createRecoveryIncidentTrendEngine({ maxIncidents: 1 }).compare({
      scope: "graph", previous: triage(1, { a: "high", b: "medium" }),
      current: triage(2, {})
    })).toThrow("Invalid");
  });
  it("accepts real triage engine output", () => {
    const engine = createRecoveryIncidentTriageEngine();
    function report(revision, statuses) {
      const counts = {};
      const records = statuses.map((assessment, i) => {
        counts[assessment] = (counts[assessment] ?? 0) + 1;
        return { id: "r" + i, assessment, persistedStatus: "executing", safeToRetry: false };
      });
      return { revision, total: records.length, records, counts,
        readOnly: true, automaticRecovery: false };
    }
    const previous = engine.assess(report(1, ["reconcile", "consistent"]));
    const current = engine.assess(report(2, ["inconsistent", "missing"]));
    const trend = createRecoveryIncidentTrendEngine().compare({
      scope: "graph", previous, current
    });
    expect(trend.escalated).toEqual(["r0"]);
    expect(trend.added).toEqual(["r1"]);
  });
});
