/**

* XSUS AI Core — Response Quality Regression Detector
* Version: 1.0.0
* 
* Krahasimi i dy raporteve të evaluatorit për të zbuluar regresionet.
  */

export const RESPONSE_QUALITY_REGRESSION_DETECTOR_VERSION = "1.0.0";

const isPlainObject = (value) => {
if (value === null || typeof value !== "object") {
return false;
}

const prototype = Object.getPrototypeOf(value);

return prototype === Object.prototype || prototype === null;
};

const validateEvaluation = (evaluation, label) => {
if (!isPlainObject(evaluation)) {
throw new TypeError("${label} duhet të jetë objekt i thjeshtë.");
}

if (!Array.isArray(evaluation.results)) {
throw new TypeError("${label}.results duhet të jetë array.");
}

const ids = new Set();

for (const result of evaluation.results) {
if (!isPlainObject(result)) {
throw new TypeError(
"${label} përmban një rezultat të pavlefshëm."
);
}

if (
  typeof result.id !== "string" ||
  result.id.trim().length === 0
) {
  throw new TypeError(
    `${label} përmban një rezultat pa ID të vlefshme.`
  );
}

if (ids.has(result.id)) {
  throw new TypeError(
    `${label} përmban ID të përsëritur: ${result.id}.`
  );
}

if (
  result.passed !== true &&
  result.passed !== false &&
  result.passed !== null
) {
  throw new TypeError(
    `${label} përmban status të pavlefshëm për "${result.id}".`
  );
}

ids.add(result.id);

}
};

const freezeDeep = (value) => {
if (
value === null ||
typeof value !== "object" ||
Object.isFrozen(value)
) {
return value;
}

for (const key of Reflect.ownKeys(value)) {
freezeDeep(value[key]);
}

return Object.freeze(value);
};

const indexResults = (evaluation) =>
new Map(evaluation.results.map((result) => [result.id, result]));

const calculatePassRate = (results) => {
const assessed = results.filter(
(result) => result.passed === true || result.passed === false
);

if (assessed.length === 0) {
return null;
}

const passed = assessed.filter(
(result) => result.passed === true
).length;

return Number(((passed / assessed.length) * 100).toFixed(2));
};

/**

* Krahason një vlerësim bazë me një vlerësim të ri.
* 
* @param {object} baseline Vlerësimi i mëparshëm.
* @param {object} current Vlerësimi i ri.
* @returns {Readonly<object>}
  */
  export const detectResponseQualityRegressions = (
  baseline,
  current
  ) => {
  validateEvaluation(baseline, "baseline");
  validateEvaluation(current, "current");

const baselineMap = indexResults(baseline);
const currentMap = indexResults(current);

const regressions = [];
const recovered = [];
const added = [];
const removed = [];
const unchanged = [];
const unassessed = [];

for (const [id, currentResult] of currentMap) {
const previous = baselineMap.get(id);

if (!previous) {
  added.push(id);
  continue;
}

if (
  previous.passed === true &&
  currentResult.passed === false
) {
  regressions.push(id);
  continue;
}

if (
  previous.passed === false &&
  currentResult.passed === true
) {
  recovered.push(id);
  continue;
}

if (
  previous.passed === null ||
  currentResult.passed === null
) {
  unassessed.push(id);
  continue;
}

unchanged.push(id);

}

for (const id of baselineMap.keys()) {
if (!currentMap.has(id)) {
removed.push(id);
}
}

const baselinePassRate = calculatePassRate(baseline.results);
const currentPassRate = calculatePassRate(current.results);

const passRateDelta =
baselinePassRate === null || currentPassRate === null
? null
: Number(
(currentPassRate - baselinePassRate).toFixed(2)
);

return freezeDeep({
version: RESPONSE_QUALITY_REGRESSION_DETECTOR_VERSION,
baseline: {
scenarioCount: baseline.results.length,
passRate: baselinePassRate
},
current: {
scenarioCount: current.results.length,
passRate: currentPassRate
},
passRateDelta,
hasRegressions: regressions.length > 0,
regressions,
recovered,
added,
removed,
unchanged,
unassessed
});
};

export default detectResponseQualityRegressions;
