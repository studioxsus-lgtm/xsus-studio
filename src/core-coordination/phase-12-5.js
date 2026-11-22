export const COORDINATION_VERSION = "12.5.1";
export class CoordinationError extends Error {
  constructor(code) { super(code); this.name = "CoordinationError"; this.code = code; }
}
const validText = value => typeof value === "string" && value.trim().length > 0 && value.length <= 4096;
const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
function safeRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return !["memory", "messages", "accessToken", "token", "credentials", "secret"].some(key => own(value, key));
}
export function validateLanguageResult(value) {
  if (!safeRecord(value) || value.core !== "future-xsus-core" ||
      !validText(value.text) || typeof value.review_required !== "boolean" ||
      !["corrected", "unchanged", "review_required"].includes(value.status)) {
    throw new CoordinationError("invalid_language_result");
  }
  if (value.review_required || value.status === "review_required") {
    throw new CoordinationError("language_review_required");
  }
  return Object.freeze({core: value.core, text: value.text, status: value.status});
}
export function validatePlanResult(value) {
  if (!safeRecord(value) || value.core !== "hyper-xsus-core" ||
      value.state !== "draft" || value.executable !== false ||
      value.dependencyGraphValid !== true || !Array.isArray(value.steps) ||
      value.steps.length < 1 || value.steps.length > 100) {
    throw new CoordinationError("invalid_plan_result");
  }
  const ids = new Set();
  for (const step of value.steps) {
    if (!safeRecord(step) || !validText(step.id) || !validText(step.task) ||
        !Array.isArray(step.dependsOn) || ids.has(step.id)) {
      throw new CoordinationError("invalid_plan_result");
    }
    ids.add(step.id);
  }
  for (const step of value.steps) {
    if (step.dependsOn.some(id => !ids.has(id) || id === step.id)) {
      throw new CoordinationError("invalid_plan_result");
    }
  }
  const stepsById = new Map(value.steps.map(step => [step.id, step]));
  const visiting = new Set(), visited = new Set();
  function visit(id) {
    if (visiting.has(id)) throw new CoordinationError("cyclic_plan");
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dep of stepsById.get(id).dependsOn) visit(dep);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of ids) visit(id);
  return Object.freeze({
    core: value.core, state: "draft", executable: false,
    dependencyGraphValid: true,
    steps: Object.freeze(value.steps.map(step => Object.freeze({
      id: step.id, task: step.task, dependsOn: Object.freeze([...step.dependsOn])
    })))
  });
}
export async function coordinateDraft({goal, future, hyper, signal} = {}) {
  if (!validText(goal) || typeof future !== "function" || typeof hyper !== "function")
    throw new CoordinationError("invalid_request");
  if (signal?.aborted) throw new CoordinationError("aborted");
  const language = validateLanguageResult(await future({text: goal, signal}));
  if (signal?.aborted) throw new CoordinationError("aborted");
  const plan = validatePlanResult(await hyper({goal: language.text, signal}));
  if (signal?.aborted) throw new CoordinationError("aborted");
  return Object.freeze({
    contractVersion: COORDINATION_VERSION,
    status: "completed",
    language, plan,
    safety: Object.freeze({executable: false, sideEffects: false})
  });
}
