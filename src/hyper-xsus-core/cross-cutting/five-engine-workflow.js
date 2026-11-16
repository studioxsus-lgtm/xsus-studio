/**
 * Hyper XSUS Core — Five Engine Workflow v1.0.0
 * Explicit, bounded, read-only orchestration of five independent engines.
 * No automatic facts, claims of truth, network calls or persistence.
 */
import { createSemanticEvidenceAnalyzer } from "./semantic-evidence-analyzer.js";
import { createMultiStepReasoningEngine } from "./multi-step-reasoning-engine.js";
import { createIntelligentTaskPlanner } from "./intelligent-task-planner.js";
import { createResponseEvaluationEngine } from "./response-evaluation-engine.js";
import { createSpecializedEngineCoordinator } from "./specialized-engine-coordinator.js";
export const FIVE_ENGINE_WORKFLOW_VERSION = "1.0.0";
export function createFiveEngineWorkflow({
  engines, minimumScore = 0.8, maxEvidence = 32, maxTasks = 512, maxEngines = 16
} = {}) {
  const semantic = createSemanticEvidenceAnalyzer({ maxEvidence });
  const reasoning = createMultiStepReasoningEngine();
  const planner = createIntelligentTaskPlanner({ maxTasks });
  const evaluator = createResponseEvaluationEngine({ minimumScore });
  const coordinator = createSpecializedEngineCoordinator({ engines, maxEngines });
  async function run({
    query, evidence = [], facts = [], rules = [], tasks = [], requests = [],
    qualityChecks = [], findings = []
  } = {}) {
    // Prepare and validate every pure stage before invoking any specialized engine.
    const analysis = semantic.analyze({ query, evidence });
    const inference = reasoning.reason({ facts, rules });
    if (inference.incomplete) {
      const error = new Error("Reasoning round limit reached; workflow not executed.");
      error.code = "HYPER_REASONING_INCOMPLETE";
      throw error;
    }
    const plan = planner.plan(tasks);
    const quality = evaluator.evaluate({ checks: qualityChecks, findings });
    // Invalid specialist batches must never be disguised as quality rejections.
    const preparedRequests = coordinator.validateRequests(requests);
    // The caller supplies actual quality evidence; no invented scoring.
    if (!quality.accepted) {
      return Object.freeze({
        version: FIVE_ENGINE_WORKFLOW_VERSION, status: "quality-rejected",
        semantic: analysis, reasoning: inference, plan, quality,
        coordination: null, executionAttempted: false
      });
    }
    const coordination = await coordinator.coordinate({ requests: preparedRequests });
    return Object.freeze({
      version: FIVE_ENGINE_WORKFLOW_VERSION,
      status: coordination.failed === 0 ? "completed" : "degraded",
      semantic: analysis, reasoning: inference, plan, quality, coordination,
      executionAttempted: requests.length > 0
    });
  }
  return Object.freeze({ version: FIVE_ENGINE_WORKFLOW_VERSION, run });
}
