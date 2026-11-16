/**
 * Server-only cleanup for incomplete or failed XSUS App web builds.
 * This is a best-effort recovery action, never a substitute for durable
 * reconciliation. Must only be called after trusted authorization.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FILES = Object.freeze(["index.html", "styles.css", "app.js"]);

export function createHyperWebArtifactCleanup({
  url, serviceRoleKey, fetchImpl = globalThis.fetch
} = {}) {
  let origin;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" ||
        !/^[a-z0-9-]+\.supabase\.co$/i.test(parsed.hostname) ||
        parsed.pathname !== "/" || parsed.search || parsed.hash ||
        parsed.port || parsed.username || parsed.password)
      throw Error("invalid");
    origin = parsed.origin;
  } catch {
    throw new TypeError("Invalid artifact cleanup configuration.");
  }
  if (typeof serviceRoleKey !== "string" || !serviceRoleKey.trim() ||
      typeof fetchImpl !== "function")
    throw new TypeError("Invalid artifact cleanup configuration.");

  return async function cleanupArtifact({ userId, projectId, artifactId } = {}) {
    if (![userId, projectId, artifactId].every(
      value => typeof value === "string" && UUID.test(value)
    )) return false;

    const prefix = [userId, projectId, artifactId].join("/");
    try {
      const response = await fetchImpl(
        origin + "/storage/v1/object/xsus-app-builds", {
          method: "DELETE", redirect: "error",
          headers: {
            apikey: serviceRoleKey,
            Authorization: "Bearer " + serviceRoleKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            prefixes: FILES.map(name => prefix + "/" + name)
          }),
          signal: AbortSignal.timeout(10000)
        }
      );
      return response?.status === 200;
    } catch {
      return false;
    }
  };
}
