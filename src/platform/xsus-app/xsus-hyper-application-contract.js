/**
 * Hyper XSUS Core application operations — proposed backend contract.
 *
 * Contract-only: no network calls and no execution endpoint is enabled.
 * The server implementation and its authorization controls must be verified
 * before the Hyper gateway may expose these operations.
 */
export const HYPER_APP_CONTRACT_VERSION = "1.0.0";
export const HYPER_APP_OPERATIONS = Object.freeze(["application.plan", "application.build"]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PROMPT_LENGTH = 8000;

export function createHyperApplicationRequest({ operation, projectId, prompt } = {}) {
  if (!HYPER_APP_OPERATIONS.includes(operation))
    throw new TypeError("Unsupported Hyper application operation.");
  if (typeof projectId !== "string" || !UUID.test(projectId))
    throw new TypeError("Valid project ID is required.");
  if (typeof prompt !== "string" || !prompt.trim() || prompt.trim().length > MAX_PROMPT_LENGTH)
    throw new TypeError("Prompt must contain 1 to 8000 characters.");
  return Object.freeze({
    contractVersion: HYPER_APP_CONTRACT_VERSION,
    operation,
    projectId,
    prompt: prompt.trim()
  });
}

/**
 * A response is not proof of authorization. The Render backend must verify
 * Supabase JWT, project ownership and operation permission before execution.
 */
export function parseHyperApplicationResponse(value, { operation, projectId } = {}) {
  if (!HYPER_APP_OPERATIONS.includes(operation) ||
      typeof projectId !== "string" || !UUID.test(projectId))
    throw new TypeError("Invalid expected Hyper operation context.");
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      value.ok !== true || value.contractVersion !== HYPER_APP_CONTRACT_VERSION ||
      value.operation !== operation || value.projectId !== projectId ||
      typeof value.requestId !== "string" ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(value.requestId) ||
      !["accepted", "completed"].includes(value.status) ||
      (value.status === "completed" && operation === "application.build" &&
       value.artifactId !== undefined &&
       (typeof value.artifactId !== "string" || !UUID.test(value.artifactId))))
    throw new Error("Invalid Hyper application response.");
  return Object.freeze({
    contractVersion: HYPER_APP_CONTRACT_VERSION,
    operation,
    projectId,
    requestId: value.requestId,
    status: value.status,
    ...(operation === "application.build" && value.artifactId !== undefined
      ? { artifactId: value.artifactId } : {})
  });
}
