/**
 * Server-only Supabase Storage persistence for XSUS App static build files.
 * This is NOT mounted on a public route. Bucket must be private and created
 * by an administrator. Requires trusted server-side authorization upstream.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQ = /^[A-Za-z0-9_-]{1,128}$/;
const ALLOWED = new Set(["index.html", "styles.css", "app.js"]);
export function createHyperWebArtifactStore({
  url, serviceRoleKey, bucket = "xsus-app-builds", fetchImpl = globalThis.fetch
} = {}) {
  let origin;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || !/^[a-z0-9-]+\.supabase\.co$/i.test(parsed.hostname) ||
        parsed.pathname !== "/" || parsed.search || parsed.hash || parsed.port ||
        parsed.username || parsed.password) throw Error("invalid");
    origin = parsed.origin;
  } catch { throw new TypeError("Invalid artifact storage configuration."); }
  if (typeof serviceRoleKey !== "string" || !serviceRoleKey.trim() ||
      bucket !== "xsus-app-builds" || typeof fetchImpl !== "function")
    throw new TypeError("Invalid artifact storage configuration.");

  return async function saveArtifact({
    userId, projectId, artifactId, requestId, platform, format, files
  } = {}) {
    if (![userId, projectId, artifactId].every(x => typeof x === "string" && UUID.test(x)) ||
        typeof requestId !== "string" || !REQ.test(requestId) ||
        platform !== "web" || format !== "static-web-files" ||
        !Array.isArray(files) || files.length !== 3 ||
        new Set(files.map(f => f?.path)).size !== 3 ||
        files.some(f => !ALLOWED.has(f?.path) || typeof f?.content !== "string" ||
          f.content.length === 0 || f.content.length > 100000))
      return false;
    // Upload immutable object paths; a partial failure is never reported as success.
    // Production integration must additionally implement cleanup of orphaned objects.
    const prefix = [userId, projectId, artifactId].join("/");
    const uploaded = [];
    try {
      for (const file of files) {
        const path = prefix + "/" + file.path;
        const response = await fetchImpl(
          origin + "/storage/v1/object/" + bucket + "/" + path,
          {
            method: "POST", redirect: "error",
            headers: {
              apikey: serviceRoleKey,
              Authorization: "Bearer " + serviceRoleKey,
              "Content-Type": file.path.endsWith(".html") ? "text/html; charset=utf-8" :
                file.path.endsWith(".css") ? "text/css; charset=utf-8" :
                "application/javascript; charset=utf-8",
              "x-upsert": "false",
              "cache-control": "no-store"
            },
            body: file.content, signal: AbortSignal.timeout(10000)
          }
        );
        if (response?.status !== 200 && response?.status !== 201)
          throw Error("Storage upload failed");
        uploaded.push(path);
      }
      return uploaded.length === 3;
    } catch {
      // Best-effort cleanup on partial upload; never return true on failure.
      if (uploaded.length) {
        try {
          await fetchImpl(origin + "/storage/v1/object/" + bucket, {
            method: "DELETE", redirect: "error",
            headers: {
              apikey: serviceRoleKey, Authorization: "Bearer " + serviceRoleKey,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ prefixes: uploaded }),
            signal: AbortSignal.timeout(10000)
          });
        } catch { /* Orphans require server-side reconciliation. */ }
      }
      return false;
    }
  };
}
