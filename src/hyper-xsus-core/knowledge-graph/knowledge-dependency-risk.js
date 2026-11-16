/**
 * Hyper XSUS Core — Knowledge Dependency Risk Assessment v1.0.0
 *
 * Policy-driven, read-only decision support for graph node removal.
 * Risk is a deterministic heuristic, not an authorization decision.
 * No writes, external services, or cross-core dependencies.
 */
import { createKnowledgeGraph } from "./models/knowledge-graph.model.js";
import { analyzeKnowledgeImpact, previewKnowledgeNodeRemoval } from "./knowledge-impact-analyzer.js";

export const KNOWLEDGE_DEPENDENCY_RISK_VERSION = "1.0.0";
export const KNOWLEDGE_RISK_LEVELS = Object.freeze(["low", "moderate", "high", "critical"]);
const RISK_RANK = Object.freeze({ low: 0, moderate: 1, high: 2, critical: 3 });
const DEFAULT_POLICY = Object.freeze({
  direction: "incoming",
  maxDepth: 8,
  maxAffectedNodes: 1000,
  highAffectedCount: 5,
  criticalAffectedCount: 20,
  highDirectDependents: 3,
  criticalDirectDependents: 10,
  highRelationTypes: Object.freeze(["depends_on", "implements"]),
  blockAtOrAbove: "high",
  blockTruncated: true
});

function plainObject(value) {
  return value !== null && typeof value === "object" &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const item of Object.values(value)) freeze(item);
    Object.freeze(value);
  }
  return value;
}

export function createKnowledgeRiskPolicy(overrides = {}) {
  if (!plainObject(overrides)) throw new TypeError("Risk policy must be a plain object.");
  const allowed = new Set(Object.keys(DEFAULT_POLICY));
  for (const key of Object.keys(overrides)) {
    if (!allowed.has(key)) throw new TypeError("Unknown risk policy field: " + key);
  }
  const policy = { ...DEFAULT_POLICY, ...overrides };
  if (!["outgoing", "incoming", "both"].includes(policy.direction)) {
    throw new TypeError("Invalid risk direction.");
  }
  for (const [key, maximum, minimum] of [
    ["maxDepth", 100, 0],
    ["maxAffectedNodes", 10000, 1],
    ["highAffectedCount", 1000000, 1],
    ["criticalAffectedCount", 1000000, 1],
    ["highDirectDependents", 1000000, 1],
    ["criticalDirectDependents", 1000000, 1]
  ]) {
    if (!Number.isInteger(policy[key]) || policy[key] < minimum || policy[key] > maximum) {
      throw new TypeError("Invalid risk policy integer: " + key);
    }
  }
  if (policy.criticalAffectedCount < policy.highAffectedCount ||
      policy.criticalDirectDependents < policy.highDirectDependents) {
    throw new TypeError("Critical risk thresholds must be >= high thresholds.");
  }
  if (!Array.isArray(policy.highRelationTypes) ||
      policy.highRelationTypes.length > 100 ||
      policy.highRelationTypes.some(type => typeof type !== "string" || !type.trim()) ||
      new Set(policy.highRelationTypes).size !== policy.highRelationTypes.length) {
    throw new TypeError("Invalid highRelationTypes.");
  }
  if (!Object.prototype.hasOwnProperty.call(RISK_RANK, policy.blockAtOrAbove)) {
    throw new TypeError("Invalid blockAtOrAbove risk level.");
  }
  if (typeof policy.blockTruncated !== "boolean") {
    throw new TypeError("blockTruncated must be boolean.");
  }
  return freeze({ ...policy, highRelationTypes: [...policy.highRelationTypes] });
}

function relationDependencyCounts(graph, roots, direction, relationTypes) {
  const rootSet = new Set(roots);
  const highTypes = new Set(relationTypes);
  const directDependents = new Set();
  const criticalEdges = [];
  for (const link of graph.links) {
    // incoming: a -> b means a depends on b; removing b impacts a.
    const incoming = rootSet.has(link.targetId);
    const outgoing = rootSet.has(link.sourceId);
    if ((direction === "incoming" || direction === "both") && incoming && !rootSet.has(link.sourceId)) {
      directDependents.add(link.sourceId);
      if (highTypes.has(link.relationType)) criticalEdges.push(link.id);
    }
    if ((direction === "outgoing" || direction === "both") && outgoing && !rootSet.has(link.targetId)) {
      directDependents.add(link.targetId);
      if (highTypes.has(link.relationType) && !criticalEdges.includes(link.id)) criticalEdges.push(link.id);
    }
  }
  return { directDependents: [...directDependents], criticalEdgeIds: criticalEdges };
}

/**
 * Produces a policy decision and explainable risk factors for a proposed
 * node deletion. A denied decision is advisory; no graph operation occurs.
 */
export function assessKnowledgeDependencyRisk(graphInput, nodeIds, options = {}) {
  const graph = createKnowledgeGraph(graphInput);
  const policy = createKnowledgeRiskPolicy(options);
  const impact = analyzeKnowledgeImpact(graph, nodeIds, {
    direction: policy.direction,
    maxDepth: policy.maxDepth,
    maxAffectedNodes: policy.maxAffectedNodes
  });
  const dependencies = relationDependencyCounts(
    graph, impact.roots, policy.direction, policy.highRelationTypes
  );
  const reasons = [];
  let risk = "low";
  function raise(level, code, detail) {
    if (RISK_RANK[level] > RISK_RANK[risk]) risk = level;
    reasons.push({ code, level, detail });
  }
  if (impact.affectedCount >= policy.criticalAffectedCount) {
    raise("critical", "CRITICAL_REACH", impact.affectedCount);
  } else if (impact.affectedCount >= policy.highAffectedCount) {
    raise("high", "HIGH_REACH", impact.affectedCount);
  } else if (impact.affectedCount > 0) {
    raise("moderate", "TRANSITIVE_IMPACT", impact.affectedCount);
  }
  if (dependencies.directDependents.length >= policy.criticalDirectDependents) {
    raise("critical", "CRITICAL_DIRECT_DEPENDENCIES", dependencies.directDependents.length);
  } else if (dependencies.directDependents.length >= policy.highDirectDependents) {
    raise("high", "HIGH_DIRECT_DEPENDENCIES", dependencies.directDependents.length);
  }
  if (dependencies.criticalEdgeIds.length > 0) {
    raise("high", "HIGH_VALUE_DEPENDENCY_RELATIONS", dependencies.criticalEdgeIds.length);
  }
  if (impact.truncated) raise("critical", "INCOMPLETE_IMPACT_ANALYSIS", impact.affectedCount);
  const blockedByLevel = RISK_RANK[risk] >= RISK_RANK[policy.blockAtOrAbove];
  const blockedByTruncation = policy.blockTruncated && impact.truncated;
  const allowed = !blockedByLevel && !blockedByTruncation;
  return freeze({
    version: KNOWLEDGE_DEPENDENCY_RISK_VERSION,
    graphId: graph.id,
    operation: "node.remove",
    policy,
    impact,
    riskLevel: risk,
    decision: allowed ? "review" : "blocked",
    allowedByPolicy: allowed,
    reasons,
    directDependents: dependencies.directDependents,
    highValueDependencyLinkIds: dependencies.criticalEdgeIds,
    directDependentCount: dependencies.directDependents.length
  });
}

/**
 * Preflight combines risk assessment with a fully validated proposed graph.
 * Policy blocking does not prevent inspection; nothing is committed.
 */
export function previewKnowledgeRiskControlledRemoval(graphInput, nodeIds, policy = {}) {
  const graph = createKnowledgeGraph(graphInput);
  const assessment = assessKnowledgeDependencyRisk(graph, nodeIds, policy);
  const preview = previewKnowledgeNodeRemoval(graph, nodeIds, {
    direction: assessment.policy.direction,
    maxDepth: assessment.policy.maxDepth,
    maxAffectedNodes: assessment.policy.maxAffectedNodes
  });
  return freeze({ assessment, proposedGraph: preview.proposedGraph });
}

export function createKnowledgeDependencyRiskAssessor(graphAPI, policy = {}) {
  if (!graphAPI || typeof graphAPI.getGraph !== "function") {
    throw new TypeError("graphAPI must expose getGraph().");
  }
  const validatedPolicy = createKnowledgeRiskPolicy(policy);
  return Object.freeze({
    version: KNOWLEDGE_DEPENDENCY_RISK_VERSION,
    policy: validatedPolicy,
    assess(nodeIds) {
      return assessKnowledgeDependencyRisk(graphAPI.getGraph(), nodeIds, validatedPolicy);
    },
    previewRemoval(nodeIds) {
      return previewKnowledgeRiskControlledRemoval(graphAPI.getGraph(), nodeIds, validatedPolicy);
    }
  });
}
