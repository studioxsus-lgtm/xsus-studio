/**
 * Hyper XSUS Core — Governed Change Evidence Integration v1.0.0
 *
 * Connects existing Governance and Evidence Ledger without duplicating either.
 * All events are appended after successful governance transitions. The
 * integration is synchronous and in-memory: it is NOT a distributed transaction
 * and must not be treated as durable audit enforcement in production.
 */
import { createKnowledgeChangeGovernance } from "./knowledge-change-governance.js";
import { createKnowledgeChangeEvidenceLedger } from "./knowledge-change-evidence-ledger.js";

export const GOVERNED_CHANGE_EVIDENCE_VERSION = "1.0.0";

function requireMethod(value, name, label) {
  if (!value || typeof value[name] !== "function") {
    throw new TypeError(label + " must implement " + name + "().");
  }
}
function validateClock(clock) {
  if (typeof clock !== "function") throw new TypeError("clock must be a function.");
  return () => {
    const timestamp = clock();
    if (!Number.isSafeInteger(timestamp) || timestamp < 0) {
      throw new TypeError("clock must return a non-negative safe integer.");
    }
    return timestamp;
  };
}
function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

/**
 * Create an integrated facade. Provide an existing ledger for evidence
 * continuity or a fresh one for isolated in-memory operation.
 *
 * An audit append failure after a successful governance mutation is surfaced
 * as an exception; the mutation is NOT rolled back. Callers must reconcile
 * with governance.get() and ledger.list() before retrying.
 */
export function createGovernedChangeEvidence({
  governance, ledger = createKnowledgeChangeEvidenceLedger(),
  clock = () => Date.now()
} = {}) {
  for (const method of ["propose", "approve", "reject", "execute", "get"]) {
    requireMethod(governance, method, "governance");
  }
  for (const method of ["append", "list", "verify", "exportSnapshot"]) {
    requireMethod(ledger, method, "ledger");
  }
  const now = validateClock(clock);

  function record(proposalId, actorId, action, details) {
    return ledger.append({ proposalId, actorId, action, timestamp: now(), details });
  }
  function propose(request) {
    const proposal = governance.propose(request);
    const action = proposal.status === "blocked" ? "blocked" : "proposed";
    const evidence = record(proposal.id, request.actorId, action, {
      status: proposal.status,
      operationCount: proposal.operations.length,
      riskLevel: proposal.assessment?.riskLevel ?? null
    });
    return freeze({ proposal, evidence });
  }
  function approve(id, actorId) {
    const proposal = governance.approve(id, actorId);
    const evidence = record(id, actorId, "approved", { approvalCount: proposal.approvals.length });
    return freeze({ proposal, evidence });
  }
  function reject(id, actorId) {
    const proposal = governance.reject(id, actorId);
    const evidence = record(id, actorId, "rejected", { status: proposal.status });
    return freeze({ proposal, evidence });
  }
  function execute(id, actorId) {
    try {
      const proposal = governance.execute(id, actorId);
      const evidence = record(id, actorId, "executed", {
        status: proposal.status,
        operationCount: proposal.result.operationCount
      });
      return freeze({ proposal, evidence });
    } catch (error) {
      // Stale is a genuine state transition even though execute throws.
      // Other failures (including insufficient approvals) are not recorded
      // as successful governance transitions.
      const current = governance.get(id, actorId);
      if (current.status === "stale" || current.status === "blocked") {
        const action = current.status;
        const alreadyRecorded = ledger.list({ proposalId: id, limit: 10000 })
          .some(item => item.event.action === action);
        if (!alreadyRecorded) record(id, actorId, action, { status: current.status });
      }
      throw error;
    }
  }
  function history(id, actorId) {
    // Access is checked by the existing governance read policy.
    const proposal = governance.get(id, actorId);
    const records = ledger.list({ proposalId: id, limit: 10000 });
    return freeze({ proposal, records, integrity: ledger.verify() });
  }
  return Object.freeze({
    version: GOVERNED_CHANGE_EVIDENCE_VERSION,
    propose, approve, reject, execute, history,
    verifyEvidence: expectedHeadHash => ledger.verify(expectedHeadHash),
    exportEvidence: () => ledger.exportSnapshot()
  });
}

export function createGovernedKnowledgeChanges({
  graphAPI, authorize, riskPolicy, requiredApprovals, maxProposals,
  ledger, clock
} = {}) {
  const governance = createKnowledgeChangeGovernance({
    graphAPI, authorize, riskPolicy, requiredApprovals, maxProposals
  });
  return createGovernedChangeEvidence({ governance, ledger, clock });
}
