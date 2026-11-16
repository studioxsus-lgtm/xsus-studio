/**
 * XSUS App application planning executor, server-side only.
 * Produces an architecture draft; does not compile, persist, or deploy.
 * Must be invoked only AFTER trusted dispatcher authorization.
 * Independent of XSUS AI Core and language engines.
 */
import { randomUUID } from "node:crypto";
import { createAppArchitecture } from "../../../apps/app/architect/app-architect.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createHyperApplicationPlanExecutor({
  saveDraft, createRequestId = randomUUID
} = {}) {
  if (typeof saveDraft !== "function" || typeof createRequestId !== "function")
    throw new TypeError("Trusted plan draft persistence and request ID provider are required.");

  return async function planApplication({ userId, projectId, prompt, contractVersion } = {}) {
    if (!UUID.test(userId ?? "") || !UUID.test(projectId ?? "") ||
        contractVersion !== "1.0.0" ||
        typeof prompt !== "string" || !prompt.trim() || prompt.trim().length > 8000)
      throw new TypeError("Invalid authorized application planning context.");

    const draft = createAppArchitecture({ prompt, platform: "web" });
    if (draft.metadata.status !== "architecture-draft" ||
        draft.metadata.requiresValidation !== true)
      throw new Error("Application architecture draft is not valid.");

    const requestId = createRequestId();
    if (typeof requestId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(requestId))
      throw new Error("Invalid server-generated request ID.");

    // The persistence provider must be server-side, project-scoped and durable.
    // No success response unless it confirms saving the draft.
    const saved = await saveDraft(Object.freeze({
      userId, projectId, requestId, draft
    }));
    if (saved !== true) throw new Error("Application draft persistence failed.");

    return Object.freeze({
      ok: true,
      contractVersion: "1.0.0",
      operation: "application.plan",
      projectId,
      requestId,
      status: "completed"
    });
  };
}
