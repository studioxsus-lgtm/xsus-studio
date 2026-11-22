import { CoordinationError, coordinateDraft } from "./phase-12-5.js";

export const ROUTER_VERSION = "12.5.2";
export const CAPABILITIES = Object.freeze({
  "application.plan": Object.freeze({future: "language.review", hyper: "planning.draft"}),
  "language.review": Object.freeze({future: "language.review", hyper: null})
});
const LIMIT = 4096;
const clean = s => typeof s === "string" && s.trim().length > 0 && s.length <= LIMIT;
function assertSignal(signal) {
  if (signal?.aborted) throw new CoordinationError("aborted");
}
function withTimeout(action, milliseconds, signal) {
  if (!Number.isInteger(milliseconds) || milliseconds < 1 || milliseconds > 60000)
    throw new CoordinationError("invalid_timeout");
  assertSignal(signal);
  const controller = new AbortController();
  let timer, onAbort;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new CoordinationError("engine_timeout"));
    }, milliseconds);
  });
  const aborted = new Promise((_, reject) => {
    onAbort = () => {
      controller.abort();
      reject(new CoordinationError("aborted"));
    };
    signal?.addEventListener("abort", onAbort, {once: true});
  });
  return Promise.race([Promise.resolve().then(() => action(controller.signal)), timeout, aborted])
    .finally(() => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    });
}
function publicError(error) {
  if (error instanceof CoordinationError) return error;
  return new CoordinationError("engine_unavailable");
}
export function createCoordinationRouter({future, hyper, timeoutMs = 15000} = {}) {
  if (!future || typeof future.reviewLanguage !== "function" ||
      !hyper || typeof hyper.createDraftPlan !== "function")
    throw new CoordinationError("missing_adapter");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000)
    throw new CoordinationError("invalid_timeout");
  return Object.freeze({
    capabilities: CAPABILITIES,
    async dispatch({operation, goal, signal} = {}) {
      if (!Object.hasOwn(CAPABILITIES, operation)) throw new CoordinationError("unsupported_operation");
      if (!clean(goal)) throw new CoordinationError("invalid_request");
      assertSignal(signal);
      try {
        if (operation === "language.review") {
          const {validateLanguageResult} = await import("./phase-12-5.js");
          const language = validateLanguageResult(await withTimeout(
            engineSignal => future.reviewLanguage({text: goal, signal: engineSignal}), timeoutMs, signal
          ));
          assertSignal(signal);
          return Object.freeze({contractVersion: ROUTER_VERSION, operation, status: "completed", language});
        }
        const result = await coordinateDraft({
          goal, signal,
          future: ({text}) => withTimeout(
            engineSignal => future.reviewLanguage({text, signal: engineSignal}), timeoutMs, signal
          ),
          hyper: ({goal: verifiedGoal}) => withTimeout(
            engineSignal => hyper.createDraftPlan({goal: verifiedGoal, signal: engineSignal}), timeoutMs, signal
          )
        });
        assertSignal(signal);
        return Object.freeze({...result, operation, routerVersion: ROUTER_VERSION});
      } catch (error) {
        throw publicError(error);
      }
    }
  });
}
