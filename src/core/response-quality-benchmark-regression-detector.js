
/**
 * XSUS AI Core — Response Quality Benchmark Regression Detector
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Krahasimi i dy raporteve benchmark.
 * - Zbulimi i regresioneve dhe përmirësimeve.
 * - Identifikimi i ndryshimeve të statusit.
 * - Prodhimi i një raporti të pandryshueshëm.
 */

export const RESPONSE_QUALITY_BENCHMARK_REGRESSION_DETECTOR_VERSION =
  "1.0.0";

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function deepFreeze(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Object.isFrozen(value)
  ) {
    return value;
  }

  Object.freeze(value);

  for (const key of Object.keys(value)) {
    deepFreeze(value[key]);
  }

  return value;
}

function validateReport(report, name) {
  if (!isPlainObject(report)) {
    throw new TypeError(
      name + " duhet të jetë objekt i thjeshtë."
    );
  }

  if (!Array.isArray(report.results)) {
    throw new TypeError(
      name + ".results duhet të jetë një array."
    );
  }

  const ids = new Set();

  for (let index = 0; index < report.results.length; index += 1) {
    const result = report.results[index];

    if (!isPlainObject(result)) {
      throw new TypeError(
        name +
          ".results[" +
          index +
          "] duhet të jetë objekt i thjeshtë."
      );
    }

    if (
      typeof result.id !== "string" ||
      result.id.trim().length === 0
    ) {
      throw new TypeError(
        name +
          ".results[" +
          index +
          "].id duhet të jetë tekst i vlefshëm."
      );
    }

    const id = result.id.trim();

    if (ids.has(id)) {
      throw new TypeError(
        name +
          ".results përmban ID të përsëritur: " +
          id +
          "."
      );
    }

    ids.add(id);

    if (
      result.status !== "passed" &&
      result.status !== "failed" &&
      result.status !== "missing"
    ) {
      throw new TypeError(
        name +
          ".results[" +
          index +
          "].status nuk është i vlefshëm."
      );
    }

    if (
      result.status === "passed" ||
      result.status === "failed"
    ) {
      if (
        typeof result.actual !== "number" ||
        !Number.isFinite(result.actual)
      ) {
        throw new TypeError(
          name +
            ".results[" +
            index +
            "].actual duhet të jetë numër i vlefshëm."
        );
      }
    }
  }

  return report.results;
}

function classifyChange(previous, current) {
  if (previous === undefined) {
    return {
      change: "added",
      regression: false,
      improvement: false,
    };
  }

  if (current === undefined) {
    return {
      change: "removed",
      regression: false,
      improvement: false,
    };
  }

  if (
    previous.status !== "missing" &&
    current.status === "missing"
  ) {
    return {
      change: "missing",
      regression: true,
      improvement: false,
    };
  }

  if (
    previous.status === "passed" &&
    current.status === "failed"
  ) {
    return {
      change: "regression",
      regression: true,
      improvement: false,
    };
  }

  if (
    previous.status === "failed" &&
    current.status === "passed"
  ) {
    return {
      change: "improvement",
      regression: false,
      improvement: true,
    };
  }

  if (
    previous.status === "missing" &&
    current.status === "passed"
  ) {
    return {
      change: "recovered",
      regression: false,
      improvement: true,
    };
  }

  if (
    previous.status === "missing" &&
    current.status === "failed"
  ) {
    return {
      change: "assessed_failed",
      regression: false,
      improvement: false,
    };
  }

  if (
    previous.status === "passed" &&
    current.status === "missing"
  ) {
    return {
      change: "missing",
      regression: true,
      improvement: false,
    };
  }

  if (
    previous.status === "failed" &&
    current.status === "missing"
  ) {
    return {
      change: "missing",
      regression: true,
      improvement: false,
    };
  }

  if (previous.actual === current.actual) {
    return {
      change: "unchanged",
      regression: false,
      improvement: false,
    };
  }

  const direction = current.direction || previous.direction;

  if (
    typeof previous.actual === "number" &&
    typeof current.actual === "number" &&
    (direction === "min" || direction === "max")
  ) {
    const improved =
      direction === "min"
        ? current.actual > previous.actual
        : current.actual < previous.actual;

    return {
      change: improved ? "improved" : "declined",
      regression: !improved,
      improvement: improved,
    };
  }

  return {
    change: "changed",
    regression: false,
    improvement: false,
  };
}

/**
 * Krahason raportin e mëparshëm me raportin aktual.
 *
 * @param {object} previousReport
 * @param {object} currentReport
 * @returns {object}
 */
export function detectResponseQualityBenchmarkRegressions(
  previousReport,
  currentReport
) {
  const previousResults = validateReport(
    previousReport,
    "previousReport"
  );

  const currentResults = validateReport(
    currentReport,
    "currentReport"
  );

  const previousById = new Map(
    previousResults.map((result) => [
      result.id.trim(),
      result,
    ])
  );

  const currentById = new Map(
    currentResults.map((result) => [
      result.id.trim(),
      result,
    ])
  );

  const allIds = new Set([
    ...previousById.keys(),
    ...currentById.keys(),
  ]);

  const results = [];

  for (const id of allIds) {
    const previous = previousById.get(id);
    const current = currentById.get(id);

    const classification = classifyChange(
      previous,
      current
    );

    results.push({
      id,
      previousStatus: previous
        ? previous.status
        : null,
      currentStatus: current
        ? current.status
        : null,
      previousActual:
        previous && typeof previous.actual === "number"
          ? previous.actual
          : null,
      currentActual:
        current && typeof current.actual === "number"
          ? current.actual
          : null,
      change: classification.change,
      regression: classification.regression,
      improvement: classification.improvement,
    });
  }

  const regressionCount = results.filter(
    (result) => result.regression
  ).length;

  const improvementCount = results.filter(
    (result) => result.improvement
  ).length;

  const unchangedCount = results.filter(
    (result) => result.change === "unchanged"
  ).length;

  const addedCount = results.filter(
    (result) => result.change === "added"
  ).length;

  const removedCount = results.filter(
    (result) => result.change === "removed"
  ).length;

  return deepFreeze({
    version:
      RESPONSE_QUALITY_BENCHMARK_REGRESSION_DETECTOR_VERSION,

    summary: {
      comparedCount: results.length,
      regressionCount,
      improvementCount,
      unchangedCount,
      addedCount,
      removedCount,
      hasRegressions: regressionCount > 0,
    },

    results,
  });
}

export default detectResponseQualityBenchmarkRegressions;
