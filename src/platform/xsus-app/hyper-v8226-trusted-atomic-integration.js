/**
 * Hyper v8.2.26 — trusted atomic storage composition.
 * Server-only, opt-in for isolated testing. No route registration or
 * production activation. The database migration and privilege review
 * must be independently completed before real use.
 */
import { createHyperAtomicBundleTransport } from "./hyper-v8225-atomic-bundle-transport.js";
import { createHyperTrustedEvidenceStorage } from "./hyper-v8223-trusted-evidence-storage.js";

export const HYPER_TRUSTED_ATOMIC_INTEGRATION_VERSION = "8.2.26";

export function createHyperTrustedAtomicIntegration({
  url, serviceRoleKey, key, keyId, fetchImpl, enabled = false
} = {}) {
  const transport = createHyperAtomicBundleTransport({
    url, serviceRoleKey, fetchImpl, enabled
  });
  const storage = createHyperTrustedEvidenceStorage({
    key, keyId,
    insertBundle: bundle => transport.insertBundle(bundle),
    readBundle: id => transport.readBundle(id),
    enabled
  });
  return Object.freeze({
    version: HYPER_TRUSTED_ATOMIC_INTEGRATION_VERSION,
    store: input => storage.store(input),
    readVerified: id => storage.readVerified(id),
    runtimeAttested: false,
    productionEligible: false
  });
}
