/**
 * XSUS App: trusted server-only reader for private static web build files.
 * No public URLs, no browser access, no endpoint mounting.
 * Caller MUST have verified JWT, project ownership and operation permission.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NAMES = Object.freeze(["index.html", "styles.css", "app.js"]);
const MAX_BYTES = 400000;

export function createHyperWebArtifactReader({
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
  } catch { throw new TypeError("Invalid artifact reader configuration."); }
  if (typeof serviceRoleKey !== "string" || !serviceRoleKey.trim() ||
      typeof fetchImpl !== "function")
    throw new TypeError("Invalid artifact reader configuration.");

  return async function readArtifact({ userId, projectId, artifactId } = {}) {
    if (![userId, projectId, artifactId].every(
      value => typeof value === "string" && UUID.test(value)
    )) return null;
    const prefix = [userId, projectId, artifactId].join("/");
    const files = [];
    try {
      for (const name of NAMES) {
        const response = await fetchImpl(
          origin + "/storage/v1/object/authenticated/xsus-app-builds/" +
            prefix + "/" + name,
          {
            method: "GET", redirect: "error",
            headers: {
              apikey: serviceRoleKey,
              Authorization: "Bearer " + serviceRoleKey,
              "cache-control": "no-store"
            },
            signal: AbortSignal.timeout(10000)
          }
        );
        if (response?.status !== 200) return null;
        const declaredLength = Number(response.headers?.get?.("content-length"));
        if (Number.isFinite(declaredLength) && declaredLength > MAX_BYTES)
          return null;
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.length === 0 || bytes.length > MAX_BYTES) return null;
        const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        if (!content || content.length > 100000) return null;
        files.push(Object.freeze({ path: name, content }));
      }
      return Object.freeze({
        artifactId, projectId,
        files: Object.freeze(files)
      });
    } catch { return null; }
  };
}
