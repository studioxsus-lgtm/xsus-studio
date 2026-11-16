/**
 * Server-only Supabase persistence for XSUS App architecture drafts.
 * Requires trusted authorization BEFORE invocation. No browser credentials.
 * Does not create tables, expose endpoints or activate plan/build.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQUEST_ID = /^[A-Za-z0-9_-]{1,128}$/;
export function createHyperApplicationDraftStore({
  url, serviceRoleKey, fetchImpl = globalThis.fetch
} = {}) {
  let base;
  try { base = new URL(url); } catch { throw new TypeError("Invalid draft store configuration."); }
  if (base.protocol !== "https:" || !/^[a-z0-9-]+\.supabase\.co$/i.test(base.hostname) ||
      base.pathname !== "/" || base.search || base.hash || base.port ||
      base.username || base.password ||
      typeof serviceRoleKey !== "string" || !serviceRoleKey.trim() ||
      typeof fetchImpl !== "function")
    throw new TypeError("Invalid draft store configuration.");

  return async function saveDraft({ userId, projectId, requestId, draft } = {}) {
    if (typeof userId !== "string" || !UUID.test(userId) ||
        typeof projectId !== "string" || !UUID.test(projectId) ||
        typeof requestId !== "string" || !REQUEST_ID.test(requestId) ||
        !draft || typeof draft !== "object" || Array.isArray(draft) ||
        draft.metadata?.status !== "architecture-draft" ||
        draft.metadata?.requiresValidation !== true)
      return false;
    try {
      const payload = JSON.stringify({
        project_id: projectId, owner_id: userId, request_id: requestId,
        architecture: draft, status: "architecture-draft"
      });
      if (payload.length > 65536) return false;
      const response = await fetchImpl(
        base.origin + "/rest/v1/xsus_app_architecture_drafts?select=id,project_id,owner_id,request_id",
        {
          method: "POST",
          headers: {
            apikey: serviceRoleKey,
            Authorization: "Bearer " + serviceRoleKey,
            "Content-Type": "application/json",
            Prefer: "return=representation",
            Accept: "application/json"
          },
          body: payload, redirect: "error", signal: AbortSignal.timeout(10000)
        }
      );
      if (response?.status !== 201) return false;
      const rows = await response.json();
      return Array.isArray(rows) && rows.length === 1 &&
        typeof rows[0]?.id === "string" && UUID.test(rows[0].id) &&
        rows[0].project_id === projectId &&
        rows[0].owner_id === userId &&
        rows[0].request_id === requestId;
    } catch { return false; }
  };
}
