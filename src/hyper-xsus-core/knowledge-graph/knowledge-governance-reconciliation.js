/**
 * Hyper XSUS Core — Knowledge Governance Reconciliation v1.0.0
 *
 * Read-only drift inspection and explicitly authorized evidence repair.
 * Never replays graph mutations. Never repairs an invalid hash chain.
 * A repair is a new append-only observation, not retroactive proof that
 * an earlier transition was logged when it occurred.
 *
 * An injected persistence adapter may persist exported ledger snapshots,
 * but this module does not provide an atomic database transaction.
 */
export const KNOWLEDGE_GOVERNANCE_RECONCILIATION_VERSION = "1.0.0";

const STATUS_ACTION = Object.freeze({
  pending: "proposed",
  blocked: "blocked",
  rejected: "rejected",
  stale: "stale",
  executed: "executed"
});
const TERMINAL = new Set(["blocked", "rejected", "stale", "executed"]);

function validId(value, name) {
  if (typeof value !== "string" || !value.trim() || value !== value.trim() || value.length > 256) {
    throw new TypeError(name + " must be a non-empty trimmed string of at most 256 characters.");
  }
  return value;
}
function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const entry of Object.values(value)) freeze(entry);
    Object.freeze(value);
  }
  return value;
}
function requireMethods(object, names, label) {
  if (!object || names.some(name => typeof object[name] !== "function")) {
    throw new TypeError(label + " is missing required methods.");
  }
}

/**
 * Expected evidence is derived only from the current governance snapshot.
 * We cannot infer the identities/timestamps of unrecorded intermediate
 * approvals; missing approvals are flagged for manual investigation.
 */
export function createKnowledgeGovernanceReconciler({
  governance, ledger, authorize, clock = () => Date.now()
} = {}) {
  requireMethods(governance, ["get"], "governance");
  requireMethods(ledger, ["list", "append", "verify", "exportSnapshot"], "ledger");
  if (typeof authorize !== "function") throw new TypeError("authorize callback is required.");
  if (typeof clock !== "function") throw new TypeError("clock must be a function.");

  function access(action, proposalId, actorId) {
    validId(proposalId, "proposalId");
    validId(actorId, "actorId");
    if (authorize({ action, proposalId, actorId }) !== true) {
      throw new Error("Knowledge reconciliation access denied.");
    }
  }

  function inspect(proposalId, actorId) {
    access("inspect", proposalId, actorId);
    // Existing governance policy must independently allow this read.
    const proposal = governance.get(proposalId, actorId);
    const integrity = ledger.verify();
    if (!integrity.valid) {
      return freeze({
        proposalId, status: proposal.status, integrity,
        classification: "invalid-ledger", missingActions: [], repairable: false,
        recordedActions: []
      });
    }
    const records = ledger.list({ proposalId, limit: 10000 });
    const actions = records.map(record => record.event.action);
    const expected = STATUS_ACTION[proposal.status];
    if (!expected) throw new Error("Unknown governance proposal status.");
    const missing = [];
    // Every proposal must have an initial event, either proposed or blocked.
    if (!actions.includes("proposed") && !actions.includes("blocked")) missing.push("proposed");
    if (TERMINAL.has(proposal.status) && !actions.includes(expected)) missing.push(expected);
    // For pending proposals, the number of unique approval actors is evidence.
    const approvers = new Set(records.filter(record => record.event.action === "approved")
      .map(record => record.event.actorId));
    const unrecordedApprovals = proposal.approvals.filter(actor => !approvers.has(actor));
    const extraTerminalActions = actions.filter(action =>
      TERMINAL.has(action) && action !== expected
    );
    const classification = missing.length || unrecordedApprovals.length || extraTerminalActions.length
      ? "needs-review" : "consistent";
    return freeze({
      proposalId, status: proposal.status, integrity, classification,
      recordedActions: actions, missingActions: missing,
      unrecordedApprovals, unexpectedTerminalActions: extraTerminalActions,
      repairable: missing.length > 0 && unrecordedApprovals.length === 0 &&
        extraTerminalActions.length === 0
    });
  }

  /**
   * Explicitly append an observation about the current terminal state.
   * Does not synthesize past approvals or modify the graph/governance.
   * Must never be called automatically during restart.
   */
  function reconcile(proposalId, actorId) {
    access("reconcile", proposalId, actorId);
    const before = inspect(proposalId, actorId);
    if (!before.integrity.valid) throw new Error("Cannot reconcile an invalid evidence ledger.");
    if (before.classification === "consistent") return freeze({ repaired: false, report: before });
    if (!before.repairable) throw new Error("Evidence discrepancy requires manual review.");
    const proposal = governance.get(proposalId, actorId);
    if (!TERMINAL.has(proposal.status)) {
      throw new Error("Pending proposal discrepancies require manual review.");
    }
    // Recheck status and chain before writing; synchronous API, no await.
    const again = inspect(proposalId, actorId);
    if (!again.repairable || again.status !== proposal.status) {
      throw new Error("Evidence changed during reconciliation.");
    }
    const timestamp = clock();
    if (!Number.isSafeInteger(timestamp) || timestamp < 0) {
      throw new TypeError("clock must return a non-negative safe integer.");
    }
    const action = STATUS_ACTION[proposal.status];
    // If initial evidence is missing, append only the observed terminal state.
    // A terminal event also satisfies the "initial evidence exists" check.
    const evidence = ledger.append({
      proposalId, actorId, action, timestamp,
      details: {
        reconciled: true,
        observedStatus: proposal.status,
        operationCount: proposal.result?.operationCount ?? null,
        note: "Observed current state; does not prove the original transition time."
      }
    });
    return freeze({ repaired: true, evidence, report: inspect(proposalId, actorId) });
  }

  return Object.freeze({
    version: KNOWLEDGE_GOVERNANCE_RECONCILIATION_VERSION,
    inspect, reconcile
  });
}
