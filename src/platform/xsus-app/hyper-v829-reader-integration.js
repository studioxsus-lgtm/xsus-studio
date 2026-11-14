/**
 * Hyper v8.2.9 — isolated, read-only Supabase reader composition.
 * Explicit server-owned configuration only. No env auto-discovery, HTTP route,
 * database writes, or production activation.
 */
import { createHyperSupabaseReader } from "./hyper-v828-supabase-readers.js";
import { createHyperTrustedEvidenceCollector } from "./hyper-v827-trusted-evidence-collector.js";

export const HYPER_READER_INTEGRATION_VERSION = "8.2.9";

function hostOf(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || u.username || u.password || u.search || u.hash ||
        u.pathname !== "/" || u.port) return null;
    return u.hostname.toLowerCase();
  } catch { return null; }
}

export function createHyperV829ReaderIntegration({
  audit, checkpoint, beforeRestart, afterRestart, verifyRenderRestart,
  fetchImpl
} = {}) {
  if (!audit || !checkpoint || !beforeRestart || !afterRestart ||
      typeof verifyRenderRestart !== "function") {
    throw new TypeError("Hyper trusted reader mapping is incomplete.");
  }
  const auditHost = hostOf(audit.url);
  const checkpointHost = hostOf(checkpoint.url);
  if (!auditHost || !checkpointHost || auditHost === checkpointHost ||
      !audit.serviceRoleKey || !checkpoint.serviceRoleKey ||
      audit.serviceRoleKey === checkpoint.serviceRoleKey) {
    throw new TypeError("Hyper storage projects are not independently configured.");
  }
  // Project identity is derived from configured endpoints, not supplied claims.
  const auditReader = createHyperSupabaseReader({ ...audit, fetchImpl });
  const checkpointReader = createHyperSupabaseReader({ ...checkpoint, fetchImpl });
  const beforeReader = createHyperSupabaseReader({ ...beforeRestart,
    url: audit.url, serviceRoleKey: audit.serviceRoleKey, fetchImpl });
  const afterReader = createHyperSupabaseReader({ ...afterRestart,
    url: audit.url, serviceRoleKey: audit.serviceRoleKey, fetchImpl });

  const collector = createHyperTrustedEvidenceCollector({
    readAudit: async () => {
      await auditReader.read();
      return { verified: true, projectId: auditHost };
    },
    readCheckpoint: async () => {
      await checkpointReader.read();
      return { verified: true, projectId: checkpointHost };
    },
    readBeforeRestart: () => beforeReader.read(),
    readAfterRestart: () => afterReader.read(),
    verifyRenderRestart
  });
  return Object.freeze({
    version: HYPER_READER_INTEGRATION_VERSION,
    inspect: () => collector.inspect()
  });
}
