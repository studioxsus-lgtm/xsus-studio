/**

* XSUS AI Core — Response Quality Trend Analyzer
* Version: 1.0.0
* 
* Përgjegjësitë:
* - Analizon trendet e cilësisë ndërmjet ekzekutimeve.
* - Identifikon përmirësimin, regresionin dhe stabilitetin.
* - Llogarit ndryshimin e normës së suksesit.
* - Mat stabilitetin e rezultateve.
* - Nuk ndryshon të dhënat hyrëse.
* 
* Formati i raportit:
* {
* id: "run-1",
* passRate: 0.95
* }
* 
* passRate duhet të jetë numër nga 0 deri në 1.
* Raportet duhet të jepen sipas rendit kronologjik.
  */

export const RESPONSE_QUALITY_TREND_ANALYZER_VERSION = "1.0.0";

const DEFAULT_THRESHOLD = 0.05;
const EPSILON = 1e-12;

function isPlainObject(value) {
if (value === null || typeof value !== "object") {
return false;
}

const prototype = Object.getPrototypeOf(value);

return prototype === Object.prototype || prototype === null;
}

function validateReports(reports) {
if (!Array.isArray(reports)) {
throw new TypeError("Raportet duhet të jenë një array.");
}

const ids = new Set();

return reports.map((report, index) => {
if (!isPlainObject(report)) {
throw new TypeError(
"Raporti në pozicionin ${index} duhet të jetë objekt i thjeshtë."
);
}

if (
  typeof report.id !== "string" ||
  report.id.trim().length === 0
) {
  throw new TypeError(
    `Raporti në pozicionin ${index} duhet të ketë një id të vlefshëm.`
  );
}

const id = report.id.trim();

if (ids.has(id)) {
  throw new TypeError(`ID e përsëritur: ${id}.`);
}

ids.add(id);

if (
  typeof report.passRate !== "number" ||
  !Number.isFinite(report.passRate) ||
  report.passRate < 0 ||
  report.passRate > 1
) {
  throw new TypeError(
    `Raporti "${id}" duhet të ketë passRate nga 0 deri në 1.`
  );
}

return {
  id,
  passRate: report.passRate,
};

});
}

function validateThreshold(threshold) {
if (
typeof threshold !== "number" ||
!Number.isFinite(threshold) ||
threshold < 0 ||
threshold > 1
) {
throw new TypeError(
"threshold duhet të jetë numër nga 0 deri në 1."
);
}

return threshold;
}

function calculateAverage(values) {
if (values.length === 0) {
return null;
}

return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value) {
return Number(value.toFixed(6));
}

function calculateStandardDeviation(values) {
if (values.length < 2) {
return 0;
}

const average = calculateAverage(values);

const variance =
values.reduce(
(sum, value) => sum + (value - average) ** 2,
0
) / values.length;

return Math.sqrt(variance);
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

/**

* Analizon trendin e cilësisë së përgjigjeve.
* 
* @param {Array<{id: string, passRate: number}>} reports
* @param {{threshold?: number}} options
* @returns {object} Raporti i analizës.
  */
  export function analyzeResponseQualityTrend(
  reports,
  options = {}
  ) {
  if (!isPlainObject(options)) {
  throw new TypeError("options duhet të jetë objekt i thjeshtë.");
  }

const threshold =
options.threshold === undefined
? DEFAULT_THRESHOLD
: validateThreshold(options.threshold);

const validatedReports = validateReports(reports);

const passRates = validatedReports.map(
(report) => report.passRate
);

const count = validatedReports.length;
const averagePassRate = calculateAverage(passRates);

const firstReport =
count > 0 ? validatedReports[0] : null;

const lastReport =
count > 0 ? validatedReports[count - 1] : null;

const change =
count >= 2
? lastReport.passRate - firstReport.passRate
: null;

const consecutiveChanges = [];

for (let index = 1; index < passRates.length; index += 1) {
consecutiveChanges.push(
passRates[index] - passRates[index - 1]
);
}

const averageChange = calculateAverage(consecutiveChanges);

let direction = "insufficient_data";

if (count >= 2) {
if (change > threshold + EPSILON) {
direction = "improving";
} else if (change < -threshold - EPSILON) {
direction = "regressing";
} else {
direction = "stable";
}
}

const negativeChanges = consecutiveChanges.filter(
(value) => value < -EPSILON
).length;

const positiveChanges = consecutiveChanges.filter(
(value) => value > EPSILON
).length;

const standardDeviation =
calculateStandardDeviation(passRates);

const result = {
version: RESPONSE_QUALITY_TREND_ANALYZER_VERSION,

summary: {
  reportCount: count,
  direction,
  firstPassRate: firstReport
    ? firstReport.passRate
    : null,
  latestPassRate: lastReport
    ? lastReport.passRate
    : null,
  averagePassRate:
    averagePassRate === null
      ? null
      : round(averagePassRate),
  change:
    change === null ? null : round(change),
  changePercentagePoints:
    change === null ? null : round(change * 100),
  averageConsecutiveChange:
    averageChange === null
      ? null
      : round(averageChange),
  standardDeviation: round(standardDeviation),
  negativeTransitions: negativeChanges,
  positiveTransitions: positiveChanges,
  threshold,
},

reports: validatedReports.map((report) => ({
  id: report.id,
  passRate: report.passRate,
})),

recommendations: [],

};

if (count < 2) {
result.recommendations.push(
"Mblidh të paktën dy raporte për të analizuar trendin."
);
} else if (direction === "regressing") {
result.recommendations.push(
"Kontrollo ndryshimet e fundit dhe identifiko shkakun e rënies së cilësisë."
);
} else if (direction === "improving") {
result.recommendations.push(
"Vazhdo monitorimin për të konfirmuar se përmirësimi është i qëndrueshëm."
);
} else {
result.recommendations.push(
"Vazhdo monitorimin dhe krahaso rezultatet e ardhshme."
);
}

return deepFreeze(result);
}

export default analyzeResponseQualityTrend;
