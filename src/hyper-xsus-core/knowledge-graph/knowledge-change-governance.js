/**
 * Hyper XSUS Core — Knowledge Change Governance v1.0.0
 * Reviewable change proposals with risk gates, independent approval checks,
 * stale-state protection, and atomic execution through existing Graph API.
 * In-memory workflow only; no authentication or durable storage is implied.
 */
import { createKnowledgeRiskPolicy, assessKnowledgeDependencyRisk } from "./knowledge-dependency-risk.js";

export const KNOWLEDGE_CHANGE_GOVERNANCE_VERSION = "1.0.0";

const validId = (value, field) => {
  if (typeof value !== "string" || !value.trim() || value !== value.trim() || value.length > 256) {
    throw new TypeError(field + " must be a non-empty, trimmed string (max 256).");
  }
  return value;
};
const plain = value => value !== null && typeof value === "object" &&
  !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const copy = value => JSON.parse(JSON.stringify(value));
function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const entry of Object.values(value)) freeze(entry);
    Object.freeze(value);
  }
  return value;
}

function validateOperations(operations) {
  if (!Array.isArray(operations) || operations.length < 1 || operations.length > 1000) {
    throw new TypeError("operations must contain 1 to 1000 entries.");
  }
  const supported = new Set(["addNode", "updateNode", "removeNode", "addLink", "removeLink"]);
  for (const operation of operations) {
    if (!plain(operation) || !supported.has(operation.type)) {
      throw new TypeError("Unsupported change operation.");
    }
  }
  // Force JSON-compatible data before storing it; reject accessors,
  // functions, cycles and non-finite numbers rather than silently omitting.
  function validate(value, seen = new WeakSet()) {
    if (value === null || typeof value === "string" || typeof value === "boolean") return;
    if (typeof value === "number" && Number.isFinite(value)) return;
    if (typeof value !== "object" || seen.has(value) ||
        (!Array.isArray(value) && !plain(value))) throw new TypeError("Invalid change payload.");
    seen.add(value);
    const keys = Reflect.ownKeys(value);
    if (Array.isArray(value) && (keys.length !== value.length + 1 ||
        !Array.from({ length: value.length }, (_, i) => i).every(i => Object.hasOwn(value, i)))) {
      throw new TypeError("Invalid change payload array.");
    }
    for (const key of keys) {
      if (key === "length" && Array.isArray(value)) continue;
      if (typeof key !== "string") throw new TypeError("Invalid change payload key.");
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !Object.hasOwn(descriptor, "value")) throw new TypeError("Invalid change payload accessor.");
      validate(descriptor.value, seen);
    }
    seen.delete(value);
  }
  validate(operations);
  return freeze(copy(operations));
}

export function createKnowledgeChangeGovernance({
  graphAPI, authorize, riskPolicy = {}, requiredApprovals = 1, maxProposals = 1000
} = {}) {
  if (!graphAPI || !["getGraph", "previewChanges", "applyChanges"].every(name => typeof graphAPI[name] === "function")) {
    throw new TypeError("graphAPI must expose getGraph, previewChanges and applyChanges.");
  }
  if (typeof authorize !== "function") throw new TypeError("An authorize callback is required.");
  if (!Number.isInteger(requiredApprovals) || requiredApprovals < 1 || requiredApprovals > 20) {
    throw new TypeError("requiredApprovals must be between 1 and 20.");
  }
  if (!Number.isInteger(maxProposals) || maxProposals < 1 || maxProposals > 10000) {
    throw new TypeError("maxProposals must be between 1 and 10000.");
  }
  const policy = createKnowledgeRiskPolicy(riskPolicy);
  const proposals = new Map();

  function check(action, actorId, proposalId) {
    validId(actorId, "actorId");
    if (authorize({ action, actorId, proposalId }) !== true) {
      throw new Error("Knowledge change access denied.");
    }
  }
  function lookup(id) {
    validId(id, "proposalId");
    const record = proposals.get(id);
    if (!record) throw new Error("Knowledge change proposal not found.");
    return record;
  }
  function snapshot(record) {
    return freeze({
      id: record.id, actorId: record.actorId, status: record.status,
      operations: record.operations, assessment: record.assessment,
      approvals: [...record.approvals], requiredApprovals,
      result: record.result
    });
  }

  function propose({ id, actorId, operations }) {
    validId(id, "proposalId");
    check("propose", actorId, id);
    if (proposals.has(id)) throw new Error("Duplicate knowledge change proposal.");
    if (proposals.size >= maxProposals) throw new Error("Knowledge change proposal capacity exceeded.");
    const prepared = validateOperations(operations);
    const baseline = graphAPI.getGraph();
    const preview = graphAPI.previewChanges(prepared);
    const removedIds = [...new Set(prepared.filter(op => op.type === "removeNode").map(op => op.id))];
    const assessment = removedIds.length
      ? assessKnowledgeDependencyRisk(baseline, removedIds, policy)
      : null;
    const record = {
      id, actorId, operations: prepared, baseline: JSON.stringify(baseline),
      assessment, status: assessment && !assessment.allowedByPolicy ? "blocked" : "pending",
      approvals: new Set(), result: null
    };
    proposals.set(id, record);
    return freeze({ ...snapshot(record), preview: preview.graph });
  }

  function approve(id, actorId) {
    const record = lookup(id);
    check("approve", actorId, id);
    if (record.status !== "pending") throw new Error("Proposal is not pending.");
    if (actorId === record.actorId) throw new Error("Proposer cannot approve own changes.");
    if (record.approvals.has(actorId)) throw new Error("Duplicate proposal approval.");
    record.approvals.add(actorId);
    return snapshot(record);
  }

  function reject(id, actorId) {
    const record = lookup(id);
    check("reject", actorId, id);
    if (record.status !== "pending") throw new Error("Proposal is not pending.");
    record.status = "rejected";
    return snapshot(record);
  }

  function execute(id, actorId) {
    const record = lookup(id);
    check("execute", actorId, id);
    if (record.status !== "pending") throw new Error("Proposal is not executable.");
    if (record.approvals.size < requiredApprovals) throw new Error("Insufficient independent approvals.");
    if (JSON.stringify(graphAPI.getGraph()) !== record.baseline) {
      record.status = "stale";
      throw new Error("Knowledge graph changed since proposal review.");
    }
    // Revalidate policy against the current graph before committing.
    const removedIds = [...new Set(record.operations.filter(op => op.type === "removeNode").map(op => op.id))];
    if (removedIds.length && !assessKnowledgeDependencyRisk(graphAPI.getGraph(), removedIds, policy).allowedByPolicy) {
      record.status = "blocked";
      throw new Error("Knowledge change blocked by current risk policy.");
    }
    const result = graphAPI.applyChanges(record.operations);
    record.result = freeze({ operationCount: result.operationCount });
    record.status = "executed";
    return snapshot(record);
  }

  function get(id, actorId) {
    const record = lookup(id);
    check("read", actorId, id);
    return snapshot(record);
  }

  return Object.freeze({
    version: KNOWLEDGE_CHANGE_GOVERNANCE_VERSION,
    policy, propose, approve, reject, execute, get
  });
}
