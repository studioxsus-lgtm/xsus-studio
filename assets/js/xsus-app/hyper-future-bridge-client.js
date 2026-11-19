import { getUserAccessToken } from "./auth-session.js";

const BRIDGE_URL = "https://xsus-studio.onrender.com/api/xsus-app/hyper-future/plan";
const MAX_STEPS = 100;

export class BridgeRequestError extends Error {
  constructor(code) { super(code); this.name = "BridgeRequestError"; this.code = code; }
}

export function parsePlanSteps(value) {
  const tasks = String(value ?? "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (!tasks.length || tasks.length > MAX_STEPS || tasks.some(task => task.length > 4096)) {
    throw new BridgeRequestError("invalid_steps");
  }
  return tasks.map((task, index) => ({ id: `step-${index + 1}`, task, dependsOn: [] }));
}

export async function createDraftPlan({ goal, steps, signal } = {}) {
  const cleanGoal = typeof goal === "string" ? goal.trim() : "";
  if (!cleanGoal || cleanGoal.length > 4096 || !Array.isArray(steps) || !steps.length || steps.length > MAX_STEPS) {
    throw new BridgeRequestError("invalid_input");
  }
  if (!/^https:\/\/(www\.)?xsusstudio\.com$/.test(window.location.origin)) {
    throw new BridgeRequestError("official_site_only");
  }
  const token = await getUserAccessToken();
  if (!token) throw new BridgeRequestError("sign_in_required");
  let response;
  const timeoutSignal = AbortSignal.timeout(20_000);
  const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
  try {
    response = await fetch(BRIDGE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ goal: cleanGoal, steps }),
      signal: requestSignal,
      credentials: "omit",
      redirect: "error"
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    if (timeoutSignal.aborted) throw new BridgeRequestError("timeout");
    throw new BridgeRequestError("service_unavailable");
  }
  let result;
  try { result = await response.json(); } catch { throw new BridgeRequestError("invalid_response"); }
  if (response.status === 401 || response.status === 403) throw new BridgeRequestError("sign_in_required");
  if (response.status === 422) throw new BridgeRequestError("review_required");
  if (response.status === 429) throw new BridgeRequestError("rate_limited");
  if (!response.ok) throw new BridgeRequestError(response.status >= 500 ? "service_unavailable" : "request_rejected");
  if (!result || !["completed", "review_required"].includes(result.status) ||
      result.safety?.executable !== false || result.safety?.sideEffects !== false ||
      (result.status === "completed" && !Array.isArray(result.plan?.steps))) {
    throw new BridgeRequestError("invalid_response");
  }
  return result;
}
