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
  function evaluate(input = {}) {
    if (!input || typeof input !== "object" || Array.isArray(input) ||
        (Object.getPrototypeOf(input) !== Object.prototype && Object.getPrototypeOf(input) !== null))
      throw new TypeError("Invalid language quality evidence.");
    function readInput(name, fallback) {
      const descriptor = Object.getOwnPropertyDescriptor(input, name);
      if (!descriptor) return fallback;
      if (!Object.hasOwn(descriptor, "value"))
        throw new TypeError("Invalid language quality evidence accessor.");
      return descriptor.value;
    }
    const checks = readInput("checks", undefined);
    const findings = readInput("findings", []);
    if (!Array.isArray(checks) || checks.length > 6 ||
        !Array.isArray(findings) || findings.length > maxFindings)
      throw new TypeError("Invalid language quality evidence.");
    const observed = new Map();
    function ownField(item, name, message) {
      const descriptor = Object.getOwnPropertyDescriptor(item, name);
      if (!descriptor || !Object.hasOwn(descriptor, "value"))
        throw new TypeError(message);
      return descriptor.value;
    }
    function entryAt(items, index, message) {
      const descriptor = Object.getOwnPropertyDescriptor(items, String(index));
      if (!descriptor || !Object.hasOwn(descriptor, "value"))
        throw new TypeError(message);
      const item = descriptor.value;
      if (!item || typeof item !== "object" || Array.isArray(item) ||
          (Object.getPrototypeOf(item) !== Object.prototype && Object.getPrototypeOf(item) !== null))
        throw new TypeError(message);
      return item;
    }
    for (let index = 0; index < checks.length; index++) {
      const check = entryAt(checks, index, "Invalid language quality check.");
      const name = ownField(check, "name", "Invalid language quality check.");
      const score = ownField(check, "score", "Invalid language quality check.");
      if (typeof name !== "string" || !CHECK.test(name) || observed.has(name) ||
          typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 1)
        throw new TypeError("Invalid language quality check.");
      observed.set(name, score);
    }
    const safeFindings = Array.from({ length: findings.length }, (_, index) => {
      const item = entryAt(findings, index, "Invalid language quality finding.");
      const code = ownField(item, "code", "Invalid language quality finding.");
      const severity = ownField(item, "severity", "Invalid language quality finding.");
      if (typeof code !== "string" || !/^[A-Z][A-Z0-9_]{0,63}$/.test(code) ||
          (severity !== "info" && severity !== "warning" && severity !== "error"))
        throw new TypeError("Invalid language quality finding.");
      return Object.freeze({ code, severity });
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
