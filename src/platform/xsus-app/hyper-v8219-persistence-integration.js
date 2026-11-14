/**
 * Hyper v8.2.19 — isolated persistence integration.
 * Fail closed; no environment auto-discovery, no route registration.
 * The explicit enabled switch is for isolated testing only, NOT production approval.
 */
import { createHyperSupabaseTransport } from "./hyper-v8218-supabase-transport.js";
import { createHyperEvidencePersistence } from "./hyper-v8217-evidence-persistence.js";

export const HYPER_PERSISTENCE_INTEGRATION_VERSION = "8.2.19";

export function createHyperPersistenceIntegration({
  url, serviceRoleKey, fetchImpl, enabled = false
} = {}) {
  const transport = createHyperSupabaseTransport({
    url, serviceRoleKey, fetchImpl, enabled
  });
  const persistence = createHyperEvidencePersistence({
    insertRow: row => transport.insertRow(row),
    selectRow: id => transport.selectRow(id),
    enabled
  });
  return Object.freeze({
    version: HYPER_PERSISTENCE_INTEGRATION_VERSION,
    store: input => persistence.store(input),
    read: id => persistence.read(id),
    // No production-readiness or provenance claims are made.
    productionEligible: false
  });
}
