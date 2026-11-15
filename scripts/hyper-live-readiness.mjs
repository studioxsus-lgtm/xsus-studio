/**
 * Explicit, read-only production readiness probe.
 * Run locally/in an authorized server environment, never in the browser.
 * No writes, no route activation, no secrets in output.
 * Optional XSUS_TEST_ACCESS_TOKEN verifies a real user with Supabase Auth.
 */
import { createHyperSupabaseAuthVerifier } from "../src/platform/xsus-app/hyper-v8233-supabase-auth-verifier.js";
import { createHyperEvidenceOwnerAuthorizer } from "../src/platform/xsus-app/hyper-evidence-owner-authorizer.js";

const env = process.env;
const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY",
  "XSUS_HYPER_EVIDENCE_KEY", "XSUS_HYPER_EVIDENCE_KEY_ID"];
const missing = required.filter(name => !env[name]?.trim());
const report = { mode: "READ_ONLY", productionWrites: false, routeEnabled: false,
  configPresent: missing.length === 0, missing };
if (missing.length) {
  console.log(JSON.stringify(report));
  process.exitCode = 1;
} else {
  try {
    const key = env.XSUS_HYPER_EVIDENCE_KEY;
    report.hmacKeyValid = /^[a-f0-9]{64}$/i.test(key);
    report.keyIdValid = /^[A-Za-z0-9_-]{1,64}$/.test(env.XSUS_HYPER_EVIDENCE_KEY_ID);
    report.routeEnabled = env.XSUS_HYPER_EVIDENCE_ROUTE_ENABLED === "true";
    const auth = createHyperSupabaseAuthVerifier({
      url: env.SUPABASE_URL, apiKey: env.SUPABASE_ANON_KEY, enabled: true
    });
    // Validate the owner authorizer configuration without querying a user's data.
    createHyperEvidenceOwnerAuthorizer({
      url: env.SUPABASE_URL, serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY
    });
    // Read-only Supabase REST reachability; no rows or secrets are logged.
    report.tablesReadable = {};
    for (const table of ["hyper_runtime_evidence_bundles", "hyper_evidence_owners"]) {
      try {
        const endpoint = new URL("/rest/v1/" + table + "?select=observation_id&limit=0", env.SUPABASE_URL);
        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY,
            Accept: "application/json"
          },
          redirect: "error",
          signal: AbortSignal.timeout(10000)
        });
        report.tablesReadable[table] = response.ok === true;
      } catch {
        report.tablesReadable[table] = false;
      }
    }
    report.authConfigValid = true;
    report.ownerLookupConfigValid = true;
    if (env.XSUS_TEST_ACCESS_TOKEN) {
      const principal = await auth.verifyBearerToken(env.XSUS_TEST_ACCESS_TOKEN);
      report.liveUserAuthVerified = principal.verified === true;
    } else {
      report.liveUserAuthVerified = "NOT_TESTED";
    }
    report.readyForControlledWriteTest = report.hmacKeyValid &&
      report.keyIdValid && report.authConfigValid &&
      report.ownerLookupConfigValid &&
      Object.values(report.tablesReadable).every(Boolean) &&
      report.liveUserAuthVerified === true &&
      !report.routeEnabled;
    if (!report.readyForControlledWriteTest) process.exitCode = 1;
  } catch {
    report.configurationError = true;
    process.exitCode = 1;
  }
  console.log(JSON.stringify(report));
}
