/**
 * XSUS AI Core — Response Quality Evaluation Report
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Krijimi i një raporti të standardizuar.
 * - Përmbledhja e rezultateve të cilësisë.
 * - Përmbledhja e statusit të burimeve.
 * - Identifikimi i gabimeve dhe paralajmërimeve.
 * - Propozimi i hapave për përmirësim.
 *
 * Parime:
 * - Mos ndrysho rezultatin origjinal të vlerësimit.
 * - Mos pretendo se burimet janë faktikisht të sakta.
 * - Mos lejo të dhëna të pavlefshme të prishin raportin.
 */

export const RESPONSE_QUALITY_REPORT_VERSION = "1.0.0";

export const RESPONSE_QUALITY_REPORT_STATUSES =
  Object.freeze({
    COMPLETE: "complete",
    NEEDS_IMPROVEMENT: "needs_improvement",
    INSUFFICIENT_DATA: "insufficient_data"
  });

const SCORE_THRESHOLDS = Object.freeze({
  good: 80,
  acceptable: 60
});

function isPlainObject(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function normalizeScore(value) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return null;
  }

  return Math.min(100, Math.max(0, value));
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeErrors(errors) {
  if (!Array.isArray(errors)) {
    return [];
  }

  return errors
    .filter((error) => typeof error === "string")
    .map((error) => error.trim())
    .filter(Boolean);
}

function normalizeDimensions(dimensions) {
  const input = isPlainObject(dimensions)
    ? dimensions
    : {};

  return {
    completeness: normalizeScore(input.completeness),
    clarity: normalizeScore(input.clarity),
    language: normalizeScore(input.language),
    sources: normalizeScore(input.sources)
  };
}

function calculateAverageScore(dimensions) {
  const scores = Object.values(dimensions).filter(
    (value) =>
      typeof value === "number" &&
      Number.isFinite(value)
  );

  if (scores.length === 0) {
    return null;
  }

  const total = scores.reduce(
    (sum, score) => sum + score,
    0
  );

  return Math.round((total / scores.length) * 100) / 100;
}

function normalizeSourceVerification(verification) {
  if (!isPlainObject(verification)) {
    return {
      available: false,
      sourceCount: 0,
      validCount: 0,
      invalidCount: 0,
      unverifiedCount: 0,
      verifiedCount: 0,
      trustEstablishedCount: 0,
      results: []
    };
  }

  const results = Array.isArray(verification.results)
    ? verification.results
    : [];

  const normalizedResults = results.map((result) => {
    const source = isPlainObject(result) ? result : {};

    const errors = normalizeErrors(source.errors);

    return Object.freeze({
      status: normalizeString(source.status) || "unknown",
      valid: source.valid === true,
      structurallyValid:
        source.structurallyValid === true,
      verified: source.verified === true,
      trustEstablished:
        source.trustEstablished === true,
      title: normalizeString(source.title),
      contentLength:
        Number.isSafeInteger(source.contentLength) &&
        source.contentLength >= 0
          ? source.contentLength
          : 0,
      errors: Object.freeze(errors)
    });
  });

  const validCount = normalizedResults.filter(
    (source) => source.valid
  ).length;

  const verifiedCount = normalizedResults.filter(
    (source) => source.verified
  ).length;

  const trustEstablishedCount =
    normalizedResults.filter(
      (source) => source.trustEstablished
    ).length;

  return {
    available: true,
    sourceCount: normalizedResults.length,
    validCount,
    invalidCount:
      normalizedResults.length - validCount,
    unverifiedCount:
      normalizedResults.length - verifiedCount,
    verifiedCount,
    trustEstablishedCount,
    results: normalizedResults
  };
}

function buildWarnings({
  valid,
  dimensions,
  sourceVerification
}) {
  const warnings = [];

  if (!valid) {
    warnings.push("QUALITY_INPUT_CONTAINS_ERRORS");
  }

  if (dimensions.completeness !== null &&
      dimensions.completeness < SCORE_THRESHOLDS.acceptable) {
    warnings.push("LOW_COMPLETENESS");
  }

  if (
    dimensions.clarity !== null &&
    dimensions.clarity < SCORE_THRESHOLDS.acceptable
  ) {
    warnings.push("LOW_CLARITY");
  }

  if (
    dimensions.language !== null &&
    dimensions.language < SCORE_THRESHOLDS.acceptable
  ) {
    warnings.push("LANGUAGE_MISMATCH_OR_LOW_SCORE");
  }

  if (
    sourceVerification.available &&
    sourceVerification.invalidCount > 0
  ) {
    warnings.push("SOME_SOURCES_INVALID");
  }

  if (
    sourceVerification.available &&
    sourceVerification.sourceCount > 0 &&
    sourceVerification.verifiedCount === 0
  ) {
    warnings.push("NO_SOURCES_VERIFIED");
  }

  if (
    sourceVerification.available &&
    sourceVerification.sourceCount > 0 &&
    sourceVerification.trustEstablishedCount === 0
  ) {
    warnings.push("SOURCE_TRUST_NOT_ESTABLISHED");
  }

  return warnings;
}

function buildRecommendations({
  score,
  dimensions,
  errors,
  sourceVerification
}) {
  const recommendations = [];

  if (errors.length > 0) {
    recommendations.push(
      "Korrigjo gabimet e hyrjes para se të mbështetesh te rezultati."
    );
  }

  if (
    dimensions.completeness !== null &&
    dimensions.completeness < SCORE_THRESHOLDS.good
  ) {
    recommendations.push(
      "Përmirëso plotësinë duke iu përgjigjur drejtpërdrejt të gjitha pjesëve të pyetjes."
    );
  }

  if (
    dimensions.clarity !== null &&
    dimensions.clarity < SCORE_THRESHOLDS.good
  ) {
    recommendations.push(
      "Përmirëso qartësinë me fjali më të drejtpërdrejta dhe strukturë më të lexueshme."
    );
  }

  if (
    dimensions.language !== null &&
    dimensions.language < SCORE_THRESHOLDS.good
  ) {
    recommendations.push(
      "Kontrollo që gjuha e përgjigjes të përputhet me gjuhën e kërkuar."
    );
  }

  if (
    sourceVerification.available &&
    sourceVerification.invalidCount > 0
  ) {
    recommendations.push(
      "Kontrollo titujt, përmbajtjen dhe URL-të e burimeve të pavlefshme."
    );
  }

  if (
    sourceVerification.available &&
    sourceVerification.sourceCount > 0 &&
    sourceVerification.verifiedCount === 0
  ) {
    recommendations.push(
      "Kryej verifikim të pavarur të burimeve para se t'i përdorësh si mbështetje faktike."
    );
  }

  if (
    sourceVerification.available &&
    sourceVerification.sourceCount > 0 &&
    sourceVerification.trustEstablishedCount === 0
  ) {
    recommendations.push(
      "Vlerëso besueshmërinë e burimeve veçmas nga validiteti i tyre strukturor."
    );
  }

  if (
    score !== null &&
    score < SCORE_THRESHOLDS.acceptable &&
    recommendations.length === 0
  ) {
    recommendations.push(
      "Rishiko përgjigjen dhe vlerëso përsëri dimensionet e cilësisë."
    );
  }

  return recommendations;
}

export function createResponseQualityReport(
  qualityResult,
  sourceVerification = null
) {
  if (!isPlainObject(qualityResult)) {
    throw new TypeError(
      "Rezultati i cilësisë duhet të jetë objekt."
    );
  }

  const dimensions = normalizeDimensions(
    qualityResult.dimensions
  );

  const errors = normalizeErrors(qualityResult.errors);

  const score = normalizeScore(qualityResult.score);

  const sourceCount =
    Number.isSafeInteger(qualityResult.sourceCount) &&
    qualityResult.sourceCount >= 0
      ? qualityResult.sourceCount
      : 0;

  const sourceSummary =
    normalizeSourceVerification(sourceVerification);

  const hasQualityData = Object.values(dimensions).some(
    (value) => value !== null
  );

  const valid = qualityResult.valid === true;

  const warnings = buildWarnings({
    valid,
    dimensions,
    sourceVerification: sourceSummary
  });

  const recommendations = buildRecommendations({
    score,
    dimensions,
    errors,
    sourceVerification: sourceSummary
  });

  let status;

  if (!hasQualityData) {
    status =
      RESPONSE_QUALITY_REPORT_STATUSES.INSUFFICIENT_DATA;
  } else if (
    !valid ||
    (score !== null &&
      score < SCORE_THRESHOLDS.acceptable) ||
    warnings.length > 0
  ) {
    status =
      RESPONSE_QUALITY_REPORT_STATUSES.NEEDS_IMPROVEMENT;
  } else {
    status = RESPONSE_QUALITY_REPORT_STATUSES.COMPLETE;
  }

  const sourceReport = Object.freeze({
    available: sourceSummary.available,
    sourceCount,
    verificationResultCount: sourceSummary.sourceCount,
    validCount: sourceSummary.validCount,
    invalidCount: sourceSummary.invalidCount,
    unverifiedCount: sourceSummary.unverifiedCount,
    verifiedCount: sourceSummary.verifiedCount,
    trustEstablishedCount:
      sourceSummary.trustEstablishedCount,
    results: Object.freeze(sourceSummary.results),
    note:
      "Validiteti strukturor dhe prania e burimeve nuk provojnë vërtetësinë faktike ose besueshmërinë."
  });

  const report = {
    version: RESPONSE_QUALITY_REPORT_VERSION,
    status,
    valid,
    score,
    dimensions: Object.freeze(dimensions),
    sourceCount,
    sources: sourceReport,
    errors: Object.freeze(errors),
    warnings: Object.freeze(warnings),
    recommendations: Object.freeze(recommendations)
  };

  return Object.freeze(report);
}
