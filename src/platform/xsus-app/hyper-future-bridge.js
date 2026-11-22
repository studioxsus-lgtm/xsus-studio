import { randomUUID } from "node:crypto";
import { EngineContractError, NEXT_ENGINES_CONTRACT_VERSION, strategicPlanning }\nimport { proposeApplicationPlan } from "../../hyper-xsus-core/next-engines/strategic-planning/index.js"; from "../../hyper-xsus-core/next-engines/index.js";

export const HYPER_FUTURE_BRIDGE_VERSION = "1.0.0";
export const HYPER_FUTURE_BRIDGE_PATH = "/api/xsus-app/hyper-future/plan";
const FUTURE_ORIGIN = "https://future-xsus-core-api.onrender.com";
const MAX_TEXT_CHARS = 4096;
const MAX_STEPS = 100;

function validText(value, limit = MAX_TEXT_CHARS) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= limit;
}

function validIdentifier(value) {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value);
}

function validateInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).some(key => !["goal", "steps"].includes(key)) ||
      !validText(body.goal) || (body.steps !== undefined && (!Array.isArray(body.steps) || body.steps.length < 1 || body.steps.length > MAX_STEPS))) {
    return false;
  }
  return (body.steps ?? []).every(step => step && typeof step === "object" && !Array.isArray(step) &&
    Object.keys(step).length === 3 && Object.hasOwn(step, "id") && Object.hasOwn(step, "task") &&
    Object.hasOwn(step, "dependsOn") && validIdentifier(step.id) && validText(step.task, MAX_TEXT_CHARS) &&
    Array.isArray(step.dependsOn) && step.dependsOn.length <= MAX_STEPS &&
    step.dependsOn.every(validIdentifier));
}

async function readJsonResponse(response) {
  const length = Number(response.headers?.get?.("content-length"));
  if (Number.isFinite(length) && length > 16_384) throw new Error("Future response too large.");
  const raw = await response.text();
  if (raw.length > 16_384) throw new Error("Future response too large.");
  return JSON.parse(raw);
}

export function createHyperFutureBridge({
  verifyUser,
  futureBaseUrl = FUTURE_ORIGIN,
  fetchImpl = globalThis.fetch,
  makeRequestId = randomUUID
} = {}) {
  if (typeof verifyUser !== "function" || typeof fetchImpl !== "function" ||
      typeof makeRequestId !== "function") {
    throw new TypeError("Hyper-Future bridge requires authentication, request IDs and HTTP transport.");
  }
  let futureOrigin;
  try {
    const parsed = new URL(futureBaseUrl);
    if (parsed.protocol !== "https:" || parsed.origin !== FUTURE_ORIGIN || parsed.pathname !== "/" ||
        parsed.search || parsed.hash || parsed.username || parsed.password) throw new Error();
    futureOrigin = parsed.origin;
  } catch {
    throw new TypeError("Only the configured HTTPS Future XSUS Core service is allowed.");
  }

  async function requestFuture(path, body, token) {
    const response = await fetchImpl(futureOrigin + path, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
      redirect: "error"
    });
    const data = await readJsonResponse(response);
    return { response, data };
  }

  async function handle({ method = "POST", authorization, body } = {}) {
    if (method !== "POST") return { status: 405, data: { error: "Method not allowed." } };
    if (typeof authorization !== "string" || !/^Bearer\s+\S+$/i.test(authorization)) {
      return { status: 401, data: { error: "Authentication required." } };
    }
    let user;
    try {
      user = await verifyUser(authorization);
    } catch {
      return { status: 403, data: { error: "Access denied." } };
    }
    if (!user || typeof user.userId !== "string" || !user.userId.trim() ||
        typeof user.token !== "string" || !user.token.trim()) {
      return { status: 403, data: { error: "Access denied." } };
    }
    if (!validateInput(body)) {
      return { status: 400, data: { error: "Provide an English goal and 1–100 valid plan steps." } };
    }

    const requestId = makeRequestId();
    try {
      const proofread = await requestFuture("/v1/language/proofread", {
        text: body.goal,
        language: "en"
      }, user.token);
      if (!proofread.response.ok) {
        const status = proofread.response.status === 401 || proofread.response.status === 403
          ? 403
          : proofread.response.status === 422
            ? 422
            : 503;
        return { status, data: { error: "Future XSUS Core could not process the English goal." } };
      }
      const language = proofread.data;
      if (language?.language !== "en" || typeof language.text !== "string" ||
          !validText(language.text) || typeof language.review_required !== "boolean" ||
          !["corrected", "unchanged", "partial", "review_required"].includes(language.status)) {
        return { status: 502, data: { error: "Future XSUS Core returned an invalid language result." } };
      }
      // Future's conservative proofreading uncertainty is a warning, not a
      // reason to discard the user's explicit plan. Preserve their original
      // goal in the draft whenever proofreading needs review.
      const reviewRequired = language.review_required ||
        language.status === "partial" || language.status === "review_required";
      const planningGoal = reviewRequired ? body.goal.trim() : language.text;

      let plan;
      try {
        plan = strategicPlanning.createPlan({
          contractVersion: NEXT_ENGINES_CONTRACT_VERSION,
          requestId,
          engineId: "strategic-planning",
          operation: "planning.create",
          payload: { goal: planningGoal, steps: proposal?.steps ?? body.steps },
          context: {
            traceId: requestId,
            principalId: user.userId,
            authorizationRef: "supabase-user-session"
          }
        });
      } catch (error) {
        if (error instanceof EngineContractError) {
          return { status: 422, data: { error: "Hyper XSUS Core could not validate the supplied plan steps." } };
        }
        throw error;
      }
      return {
        status: 200,
        data: {
          bridgeVersion: HYPER_FUTURE_BRIDGE_VERSION,
          requestId,
          status: reviewRequired || proposal ? "review_required" : "completed",
          language: {
            core: "future-xsus-core",
            status: language.status,
            text: language.text,
            review_required: reviewRequired
          },
          plan: { core: "hyper-xsus-core", ...plan.result, ...(proposal ? { proposalSource: proposal.source, category: proposal.category, requiresHumanReview: true } : {}) },
          safety: { executable: false, sideEffects: false }
        }
      };
    } catch {
      return { status: 503, data: { error: "The Hyper-Future bridge is temporarily unavailable." } };
    }
  }

  return Object.freeze({ version: HYPER_FUTURE_BRIDGE_VERSION, path: HYPER_FUTURE_BRIDGE_PATH, handle });
}
