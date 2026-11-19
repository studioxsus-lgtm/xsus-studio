export const APP_SPECIFICATION_CONTRACT_VERSION = "1.0.0";

const MAX_STEPS = 100;
const MAX_TEXT_LENGTH = 4096;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

function validText(value, max = MAX_TEXT_LENGTH) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function validSteps(steps) {
  if (!Array.isArray(steps) || steps.length < 1 || steps.length > MAX_STEPS) return false;
  const ids = new Set();
  for (const step of steps) {
    if (!step || typeof step !== "object" || Array.isArray(step) ||
        typeof step.id !== "string" || !SAFE_ID.test(step.id) || !validText(step.task) ||
        !Array.isArray(step.dependsOn) || ids.has(step.id)) {
      return false;
    }
    ids.add(step.id);
  }
  for (const step of steps) {
    if (step.dependsOn.length > MAX_STEPS || step.dependsOn.some(id =>
      typeof id !== "string" || !SAFE_ID.test(id) || !ids.has(id) || id === step.id
    )) {
      return false;
    }
  }
  return true;
}

function hasAcyclicDependencies(steps) {
  const byId = new Map(steps.map(step => [step.id, step]));
  const state = new Map();
  function visit(id) {
    if (state.get(id) === 1) return false;
    if (state.get(id) === 2) return true;
    state.set(id, 1);
    for (const dependency of byId.get(id).dependsOn) {
      if (!visit(dependency)) return false;
    }
    state.set(id, 2);
    return true;
  }
  return [...byId.keys()].every(visit);
}

export function validatePlanningResult(result) {
  if (!result || typeof result !== "object" || Array.isArray(result) ||
      result.status !== "completed" || !validText(result.requestId, 128) ||
      result.language?.core !== "future-xsus-core" || result.language?.review_required !== false ||
      !["corrected", "unchanged"].includes(result.language?.status) || !validText(result.language?.text) ||
      result.plan?.core !== "hyper-xsus-core" || result.plan?.state !== "draft" ||
      result.plan?.executable !== false || result.plan?.dependencyGraphValid !== true ||
      result.safety?.executable !== false || result.safety?.sideEffects !== false ||
      !validText(result.plan?.goal) || !validSteps(result.plan?.steps) ||
      !hasAcyclicDependencies(result.plan.steps)) {
    throw new TypeError("A completed, safe Hyper–Future planning result is required.");
  }
  return result;
}

export function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const item of Object.values(value)) deepFreeze(item);
  return value;
}
