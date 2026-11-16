/**
 * Trusted, server-only Supabase project owner lookup.
 * A missing project, schema, network failure or duplicate row fails closed.
 * This does not create projects and is not mounted into Render.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createHyperProjectOwnerReader({
  url, serviceRoleKey, fetchImpl = globalThis.fetch
} = {}) {
  let parsed;
  try { parsed = new URL(url); } catch {
    throw new TypeError("Invalid Hyper project owner configuration.");
  }
  if (parsed.protocol !== "https:" ||
      !/^[a-z0-9-]+\.supabase\.co$/i.test(parsed.hostname) ||
      parsed.pathname !== "/" || parsed.port || parsed.search || parsed.hash ||
      parsed.username || parsed.password ||
      typeof serviceRoleKey !== "string" || !serviceRoleKey.trim() ||
      typeof fetchImpl !== "function")
    throw new TypeError("Invalid Hyper project owner configuration.");

  return async function getProjectOwner(projectId, userId) {
    if (typeof projectId !== "string" || !UUID.test(projectId) ||
        typeof userId !== "string" || !UUID.test(userId)) return null;
    try {
      const endpoint = parsed.origin +
        "/rest/v1/xsus_app_projects?select=id,owner_id" +
        "&id=eq." + encodeURIComponent(projectId) + "&limit=2";
      const response = await fetchImpl(endpoint, {
        method: "GET",
        headers: {
          apikey: serviceRoleKey,
          Authorization: "Bearer " + serviceRoleKey,
          Accept: "application/json"
        },
        redirect: "error",
        signal: AbortSignal.timeout(10000)
      });
      if (!response?.ok) return null;
      const rows = await response.json();
      if (!Array.isArray(rows) || rows.length !== 1 ||
          rows[0]?.id !== projectId || rows[0]?.owner_id !== userId)
        return null;
      return userId;
    } catch {
      return null;
    }
  };
}
