/**

* XSUS AI Core — Response Quality Evaluator
* Version: 1.0.0
* 
* Përgjegjësitë:
* - Ekzekutimi i skenarëve të vlerësimit të cilësisë.
* - Krahasimi i statusit real me statusin e pritur.
* - Përmbledhja e rezultateve të vlerësimit.
* - Identifikimi i dështimeve pa ndalur skenarët e tjerë.
* - Kthimi i rezultateve të pandryshueshme.
* 
* Ky modul nuk ndryshon kontratën publike të AI Core.
  */

import {
createResponseQualityReport,
RESPONSE_QUALITY_REPORT_STATUSES
} from "./response-quality-report.js";

export const RESPONSE_QUALITY_EVALUATOR_VERSION = "1.0.0";

const VALID_STATUSES = new Set(
Object.values(RESPONSE_QUALITY_REPORT_STATUSES)
);

const isPlainObject = (value) => {
if (value === null || typeof value !== "object") {
return false;
}

const prototype = Object.getPrototypeOf(value);

return prototype === Object.prototype || prototype === null;
};

const normalizeId = (value) => {
if (typeof value !== "string") {
return null;
}

const id = value.trim();

return id.length > 0 ? id : null;
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

const createScenarioFailure = (scenario, error) => {
const message =
error instanceof Error
? error.message
: "Ndodhi një gabim i panjohur gjatë vlerësimit.";

return freezeDeep({
id: scenario.id,
passed: false,
expectedStatus: scenario.expectedStatus ?? null,
actualStatus: null,
report: null,
error: message
});
};

/**

* Ekzekuton skenarët e vlerësimit të cilësisë.
* 
* Formati i një skenari:
* {
* id: "sq-basic-response",
* qualityResult: { ... },
* sourceVerification: null,
* expectedStatus: "complete"
* }
* 
* expectedStatus është opsional.
* Kur mungon, skenari llogaritet si i ekzekutuar,
* por nuk përfshihet në numrin e skenarëve të krahasueshëm.
* 
* @param {Array<object>} scenarios
* @returns {Readonly<object>}
  */
  export const evaluateResponseQuality = (scenarios) => {
  if (!Array.isArray(scenarios)) {
  throw new TypeError(
  "Skenarët e vlerësimit duhet të jenë një array."
  );
  }

const ids = new Set();

const results = scenarios.map((scenario, index) => {
if (!isPlainObject(scenario)) {
throw new TypeError(
"Skenari në indeksin ${index} duhet të jetë objekt i thjeshtë."
);
}

const id = normalizeId(scenario.id);

if (id === null) {
  throw new TypeError(
    `Skenari në indeksin ${index} duhet të ketë një ID tekstuale.`
  );
}

if (ids.has(id)) {
  throw new TypeError(
    `ID e përsëritur e skenarit: ${id}.`
  );
}

ids.add(id);

const hasExpectedStatus =
  Object.prototype.hasOwnProperty.call(
    scenario,
    "expectedStatus"
  );

if (
  hasExpectedStatus &&
  !VALID_STATUSES.has(scenario.expectedStatus)
) {
  throw new TypeError(
    `Statusi i pritur për skenarin "${id}" nuk është i vlefshëm.`
  );
}

try {
  const report = createResponseQualityReport(
    scenario.qualityResult,
    scenario.sourceVerification ?? null
  );

  const expectedStatus = hasExpectedStatus
    ? scenario.expectedStatus
    : null;

  const passed =
    expectedStatus === null
      ? null
      : report.status === expectedStatus;

  return freezeDeep({
    id,
    passed,
    expectedStatus,
    actualStatus: report.status,
    report,
    error: null
  });
} catch (error) {
  return createScenarioFailure(
    {
      id,
      expectedStatus: hasExpectedStatus
        ? scenario.expectedStatus
        : null
    },
    error
  );
}

});

const executed = results.length;

const comparableResults = results.filter(
(result) => result.passed !== null
);

const passed = comparableResults.filter(
(result) => result.passed === true
).length;

const failed = comparableResults.filter(
(result) => result.passed === false
).length;

const unassessed = executed - comparableResults.length;

const passRate =
comparableResults.length === 0
? null
: Number(
((passed / comparableResults.length) * 100).toFixed(2)
);

return freezeDeep({
version: RESPONSE_QUALITY_EVALUATOR_VERSION,
executed,
assessed: comparableResults.length,
passed,
failed,
unassessed,
passRate,
results
});
};

export default evaluateResponseQuality;
