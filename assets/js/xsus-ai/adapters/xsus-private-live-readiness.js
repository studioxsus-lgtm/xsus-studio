/**
 * XSUS AI V3 — read-only live rollout readiness gate.
 * No network, database writes, secret inspection, or production activation.
 * Caller supplies independently observed verification results.
 */
export const PRIVATE_LIVE_REQUIRED_CHECKS = Object.freeze([
  "supabase_rls_six_pass",
  "frontend_actions_green",
  "backend_actions_green",
  "backend_private_route_enabled",
  "backend_assistant_writer_enabled",
  "authenticated_user_round_trip",
  "refresh_restores_both_roles",
  "second_account_isolation",
  "retry_no_duplicate_messages",
  "public_chat_unaffected"
]);

export function evaluatePrivateLiveReadiness(evidence = {}) {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    throw new TypeError("Readiness evidence must be an object.");
  }
  const checks = PRIVATE_LIVE_REQUIRED_CHECKS.map(name => Object.freeze({
    name, passed: evidence[name] === true
  }));
  const missing = checks.filter(check => !check.passed).map(check => check.name);
  return Object.freeze({
    ready: missing.length === 0,
    checks: Object.freeze(checks),
    missing: Object.freeze(missing),
    // An assessment cannot itself activate feature flags.
    activationPerformed: false
  });
}
