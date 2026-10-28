/**

* XSUS AI Core — Response Quality Benchmark Engine
* Version: 1.0.0
* 
* Përgjegjësitë:
* - Krahasimi i rezultateve me objektivat.
* - Identifikimi i objektivave të arritura dhe të paarritura.
* - Llogaritja e diferencave dhe rezultateve të përgjithshme.
* - Prodhimi i raporteve të pandryshueshme.
* 
* Shënim:
* Ky modul analizon metrikat numerike.
* Ai nuk ekzekuton vetë testet dhe nuk pretendon
* se cilësia është verifikuar pa të dhëna reale.
  */

export const RESPONSE_QUALITY_BENCHMARK_ENGINE_VERSION = "1.0.0";

function isPlainObject(value) {
if (value === null || typeof value !== "object") {
return false;
}

const prototype = Object.getPrototypeOf(value);

return prototype === Object.prototype || prototype === null;
}

function round(value) {
return Number(value.toFixed(6));
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

function validateMetric(metric, index, collectionName) {
if (!isPlainObject(metric)) {
throw new TypeError(
collectionName +
"[" +
index +
"] duhet të jetë objekt i thjeshtë."
);
}

if (
typeof metric.id !== "string" ||
metric.id.trim().length === 0
) {
throw new TypeError(
collectionName +
"[" +
index +
"] duhet të ketë id të vlefshëm."
);
}

if (
typeof metric.value !== "number" ||
!Number.isFinite(metric.value)
) {
throw new TypeError(
collectionName +
"[" +
index +
"].value duhet të jetë numër i vlefshëm."
);
}

return {
id: metric.id.trim(),
value: metric.value,
};
}

function validateCollection(metrics, collectionName) {
if (!Array.isArray(metrics)) {
throw new TypeError(
collectionName + " duhet të jetë një array."
);
}

const ids = new Set();

return metrics.map((metric, index) => {
const validated = validateMetric(
metric,
index,
collectionName
);

if (ids.has(validated.id)) {
  throw new TypeError(
    "ID e përsëritur në " +
      collectionName +
      ": " +
      validated.id +
      "."
  );
}

ids.add(validated.id);

return validated;

});
}

/**

* Krahason metrikat aktuale me objektivat.
* 
* currentMetrics:
* [{ id: "passRate", value: 0.98 }]
* 
* benchmarks:
* [{ id: "passRate", target: 0.95, direction: "min" }]
* 
* direction:
* - "min": vlera duhet të jetë të paktën sa objektivi.
* - "max": vlera duhet të jetë jo më e madhe se objektivi.
* 
* @param {Array} currentMetrics
* @param {Array} benchmarks
* @returns {object}
  */
  export function evaluateResponseQualityBenchmarks(
  currentMetrics,
  benchmarks
  ) {
  const current = validateCollection(
  currentMetrics,
  "currentMetrics"
  );

if (!Array.isArray(benchmarks)) {
throw new TypeError(
"benchmarks duhet të jetë një array."
);
}

const currentById = new Map(
current.map((metric) => [metric.id, metric.value])
);

const benchmarkIds = new Set();

const results = benchmarks.map((benchmark, index) => {
if (!isPlainObject(benchmark)) {
throw new TypeError(
"benchmarks[" +
index +
"] duhet të jetë objekt i thjeshtë."
);
}

if (
  typeof benchmark.id !== "string" ||
  benchmark.id.trim().length === 0
) {
  throw new TypeError(
    "benchmarks[" +
      index +
      "] duhet të ketë id të vlefshëm."
  );
}

const id = benchmark.id.trim();

if (benchmarkIds.has(id)) {
  throw new TypeError(
    "ID e përsëritur në benchmarks: " + id + "."
  );
}

benchmarkIds.add(id);

if (
  typeof benchmark.target !== "number" ||
  !Number.isFinite(benchmark.target)
) {
  throw new TypeError(
    'Objektivi për "' +
      id +
      '" duhet të jetë numër i vlefshëm.'
  );
}

if (
  benchmark.direction !== "min" &&
  benchmark.direction !== "max"
) {
  throw new TypeError(
    'direction për "' + id + '" duhet të jetë "min" ose "max".'
  );
}

if (!currentById.has(id)) {
  return {
    id,
    target: benchmark.target,
    direction: benchmark.direction,
    actual: null,
    gap: null,
    status: "missing",
    passed: false,
  };
}

const actual = currentById.get(id);

const gap =
  benchmark.direction === "min"
    ? actual - benchmark.target
    : benchmark.target - actual;

const passed =
  benchmark.direction === "min"
    ? actual >= benchmark.target
    : actual <= benchmark.target;

return {
  id,
  target: benchmark.target,
  direction: benchmark.direction,
  actual,
  gap: round(gap),
  status: passed ? "passed" : "failed",
  passed,
};

});

const passedCount = results.filter(
(result) => result.status === "passed"
).length;

const failedCount = results.filter(
(result) => result.status === "failed"
).length;

const missingCount = results.filter(
(result) => result.status === "missing"
).length;

const assessedCount = passedCount + failedCount;

const passRate =
assessedCount === 0
? null
: round(passedCount / assessedCount);

const report = {
version: RESPONSE_QUALITY_BENCHMARK_ENGINE_VERSION,

summary: {
  benchmarkCount: results.length,
  passedCount,
  failedCount,
  missingCount,
  assessedCount,
  passRate,
  allPassed:
    results.length > 0 &&
    passedCount === results.length,
},

results,

};

return deepFreeze(report);
}

export default evaluateResponseQualityBenchmarks;
