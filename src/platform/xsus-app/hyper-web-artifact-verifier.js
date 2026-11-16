/**
 * XSUS App — server-side verification of persisted static web build files.
 * No public route. The caller must already have passed the Hyper authorization gate.
 * Verifies exact bytes after upload; never trusts an upload HTTP status alone.
 */
import { createHash, timingSafeEqual } from "node:crypto";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NAMES = Object.freeze(["index.html", "styles.css", "app.js"]);
const digest = data => createHash("sha256").update(data).digest();

export function createHyperWebArtifactVerifier({
  url, serviceRoleKey, fetchImpl = globalThis.fetch
} = {}) {
  let origin;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" ||
        !/^[a-z0-9-]+\.supabase\.co$/i.test(parsed.hostname) ||
        parsed.pathname !== "/" || parsed.search || parsed.hash ||
        parsed.port || parsed.username || parsed.password) throw Error("invalid");
    origin = parsed.origin;
  } catch { throw new TypeError("Invalid artifact verification configuration."); }
  if (typeof serviceRoleKey !== "string" || !serviceRoleKey.trim() ||
      typeof fetchImpl !== "function")
    throw new TypeError("Invalid artifact verification configuration.");

  return async function verifyArtifact({ userId, projectId, artifactId, files } = {}) {
    if (![userId, projectId, artifactId].every(x => typeof x === "string" && UUID.test(x)) ||
        !Array.isArray(files) || files.length !== NAMES.length ||
        NAMES.some((name, index) => files[index]?.path !== name ||
          typeof files[index]?.content !== "string" ||
          files[index].content.length === 0 || files[index].content.length > 100000))
      return false;

    const prefix = [userId, projectId, artifactId].join("/");
    try {
      for (const file of files) {
        const response = await fetchImpl(
          origin + "/storage/v1/object/authenticated/xsus-app-builds/" +
          prefix + "/" + file.path,
          {
            method: "GET", redirect: "error",
            headers: { apikey: serviceRoleKey,
              Authorization: "Bearer " + serviceRoleKey,
              "cache-control": "no-store" },
            signal: AbortSignal.timeout(10000)
          }
        );
        if (response?.status !== 200) return false;
        const bytes = new Uint8Array(await response.arrayBuffer());
        const expected = new TextEncoder().encode(file.content);
        if (bytes.length !== expected.length ||
            !timingSafeEqual(digest(bytes), digest(expected))) return false;
      }
      return true;
    } catch { return false; }
  };
}
