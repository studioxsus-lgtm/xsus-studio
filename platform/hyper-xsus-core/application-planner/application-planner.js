/**
 * Hyper XSUS Core — deterministic application plan engine v1.
 * Backend domain module. No browser, network, database, filesystem or code execution.
 * Not an AI generator: produces a validated, bounded starter plan from an authorized prompt.
 */
export const APPLICATION_PLANNER_VERSION = "1.0.0";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PROMPT = 8000;
const MAX_FEATURES = 8;
const FEATURES = Object.freeze([
  ["authentication", /\b(auth|authentication|login|sign.?in|sign.?up|identifikim|hyrje|connexion)\b/i],
  ["dashboard", /\b(dashboard|panel|pult|tableau de bord)\b/i],
  ["search", /\b(search|filter|kerkim|kërkim|recherche|filtre)\b/i],
  ["notifications", /\b(notification|alert|njoftim|notification)\b/i],
  ["payments", /\b(payment|checkout|billing|pages|pagesa|paiement)\b/i],
  ["reporting", /\b(report|analytics|raport|statistik|rapport)\b/i],
  ["uploads", /\b(upload|attachment|ngarkim|fichier|file)\b/i],
  ["settings", /\b(settings|preferences|cilësim|paramètres)\b/i]
]);
const deepFreeze = obj => {
  if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
    Object.values(obj).forEach(deepFreeze);
    Object.freeze(obj);
  }
  return obj;
};
function assertPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype)
    throw new TypeError("A plain planner request is required.");
}
export function createApplicationPlan({ projectId, userId, prompt } = {}) {
  const input = { projectId, userId, prompt };
  assertPlainObject(input);
  if (typeof projectId !== "string" || !UUID.test(projectId))
    throw new TypeError("A valid project ID is required.");
  if (typeof userId !== "string" || !UUID.test(userId))
    throw new TypeError("A verified user ID is required.");
  if (typeof prompt !== "string")
    throw new TypeError("A text prompt is required.");
  const normalized = prompt.trim();
  if (!normalized || normalized.length > MAX_PROMPT || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(normalized))
    throw new TypeError("Prompt must be 1–8000 printable characters.");
  const features = FEATURES.filter(([, pattern]) => pattern.test(normalized))
    .slice(0, MAX_FEATURES).map(([name]) => name);
  const modules = [
    { id: "ui", responsibility: "Application interface" },
    { id: "domain", responsibility: "Application business rules" },
    { id: "data", responsibility: "Project-scoped persistence contract" }
  ];
  if (features.includes("authentication"))
    modules.push({ id: "auth", responsibility: "Server-verified identity and authorization" });
  if (features.includes("payments"))
    modules.push({ id: "payments", responsibility: "Provider integration boundary; no payment execution" });
  const plan = {
    version: APPLICATION_PLANNER_VERSION,
    projectId, userId,
    summary: normalized.slice(0, 240),
    features,
    modules,
    steps: [
      { id: "requirements", dependsOn: [], description: "Review requirements and permissions" },
      { id: "architecture", dependsOn: ["requirements"], description: "Define isolated modules and data contracts" },
      { id: "implementation", dependsOn: ["architecture"], description: "Implement approved components" },
      { id: "verification", dependsOn: ["implementation"], description: "Run security and regression tests" }
    ],
    limitations: [
      "Planning only; no source files generated or executed",
      "Requires server-side authorization before invocation",
      "Human review required before production build"
    ]
  };
  return deepFreeze(plan);
}

/** Factory for the existing authorization-first dispatcher; no auto-wiring. */
export function createApplicationPlanExecutor() {
  return async function planApplication({ projectId, userId, prompt, contractVersion } = {}) {
    if (contractVersion !== APPLICATION_PLANNER_VERSION)
      throw new TypeError("Unsupported application contract version.");
    const plan = createApplicationPlan({ projectId, userId, prompt });
    // The current public contract intentionally strips plan data.
    // A future reviewed plan-result contract may expose a persisted plan ID.
    return Object.freeze({
      ok: true, contractVersion, operation: "application.plan",
      projectId, requestId: "plan_" + projectId.replace(/-/g, "").slice(0, 24),
      status: "completed", internalPlan: plan
    });
  };
}
