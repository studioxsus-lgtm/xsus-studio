/**
 * Hyper XSUS Core — Language Quality Gate v1.0.0
 * Explicit rule-based quality assessment of structured engine evidence.
 * Does not claim linguistic correctness without supplied evidence.
 */
export const LANGUAGE_QUALITY_GATE_VERSION = "1.0.0";
const CHECK = /^(grammar|morphology|syntax|coherence|completeness|safety)$/;
export function createLanguageQualityGate({
  requiredChecks = ["grammar", "syntax"], minimumScore = 0.8, maxFindings = 128
} = {}) {
  if (!Array.isArray(requiredChecks) || requiredChecks.length === 0 ||
      requiredChecks.length > 6 || requiredChecks.some(c => typeof c !== "string" || !CHECK.test(c)) ||
      new Set(requiredChecks).size !== requiredChecks.length ||
      typeof minimumScore !== "number" || !Number.isFinite(minimumScore) ||
      minimumScore < 0 || minimumScore > 1 ||
      !Number.isSafeInteger(maxFindings) || maxFindings < 1 || maxFindings > 10000)
    throw new TypeError("Invalid language quality gate configuration.");
  const required = Object.freeze([...requiredChecks].sort());
  function evaluate({ checks, findings = [] } = {}) {
    if (!Array.isArray(checks) || checks.length > 6 ||
        !Array.isArray(findings) || findings.length > maxFindings)
      throw new TypeError("Invalid language quality evidence.");
    const observed = new Map();
    for (const check of checks) {
      if (!check || typeof check.name !== "string" || !CHECK.test(check.name) ||
          observed.has(check.name) || typeof check.score !== "number" ||
          !Number.isFinite(check.score) || check.score < 0 || check.score > 1)
        throw new TypeError("Invalid language quality check.");
      observed.set(check.name, check.score);
    }
    const safeFindings = findings.map(item => {
      if (!item || typeof item.code !== "string" || !/^[A-Z][A-Z0-9_]{0,63}$/.test(item.code) ||
          (item.severity !== "info" && item.severity !== "warning" && item.severity !== "error"))
        throw new TypeError("Invalid language quality finding.");
      return Object.freeze({ code: item.code, severity: item.severity });
    });
    const missing = required.filter(name => !observed.has(name));
    const failing = required.filter(name => observed.has(name) && observed.get(name) < minimumScore);
    const errors = safeFindings.filter(item => item.severity === "error").length;
    const passed = missing.length === 0 && failing.length === 0 && errors === 0;
    return Object.freeze({
      version: LANGUAGE_QUALITY_GATE_VERSION, passed,
      status: passed ? "accepted" : "rejected",
      requiredChecks: required,
      missingChecks: Object.freeze(missing),
      belowThreshold: Object.freeze(failing),
      errorCount: errors,
      scores: Object.freeze([...observed].sort(([a], [b]) => a.localeCompare(b))
        .map(([name, score]) => Object.freeze({ name, score }))),
      findings: Object.freeze(safeFindings),
      evidenceBased: true, linguisticAccuracyVerified: false
    });
  }
  return Object.freeze({ version: LANGUAGE_QUALITY_GATE_VERSION, evaluate });
}
