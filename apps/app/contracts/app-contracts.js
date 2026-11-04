/**

* XSUS Studio — XSUS App Contracts
* Version: 1.1.0
* 
* Kontratat zyrtare të komunikimit për XSUS App Engine.
  */

export const XSUS_APP_CONTRACT_VERSION = "1.1.0";

export const APP_REQUEST_TYPES = Object.freeze([
"architecture",
"code-generation",
"frontend",
"backend",
"database",
"api",
"debugging",
"testing",
"export"
]);

export const APP_PLATFORMS = Object.freeze([
"web",
"android",
"ios",
"desktop"
]);

export const APP_ERROR_CODES = Object.freeze([
"INVALID_REQUEST",
"PROMPT_TOO_LONG",
"UNSUPPORTED_PLATFORM",
"ARCHITECT_NOT_CONFIGURED",
"ARCHITECTURE_FAILED",
"APP_ENGINE_FAILURE",
"GENERATION_FAILED",
"VALIDATION_FAILED",
"EXPORT_FAILED",
"INVALID_PROJECT",
"PROJECT_NOT_FOUND",
"WORKSPACE_FAILURE",
"INTEGRATION_FAILURE"
]);

function isValidError(error) {
if (typeof error === "string") {
return error.trim().length > 0;
}

if (!error || typeof error !== "object" || Array.isArray(error)) {
return false;
}

return (
typeof error.message === "string" &&
error.message.trim().length > 0
);
}

export function createAppRequest({
type,
prompt,
platform = "web",
language = "auto",
projectId = null,
requirements = []
} = {}) {
if (!APP_REQUEST_TYPES.includes(type)) {
throw new TypeError("Lloji i kërkesës nuk mbështetet.");
}

if (typeof prompt !== "string" || !prompt.trim()) {
throw new TypeError("Përshkrimi i kërkesës është i pavlefshëm.");
}

if (!APP_PLATFORMS.includes(platform)) {
throw new TypeError("Platforma e kërkuar nuk mbështetet.");
}

if (typeof language !== "string" || !language.trim()) {
throw new TypeError("Gjuha e kërkesës është e pavlefshme.");
}

if (
projectId !== null &&
(typeof projectId !== "string" || !projectId.trim())
) {
throw new TypeError("Identifikuesi i projektit është i pavlefshëm.");
}

if (!Array.isArray(requirements)) {
throw new TypeError("Kërkesat duhet të jenë listë.");
}

return Object.freeze({
contractVersion: XSUS_APP_CONTRACT_VERSION,
type,
prompt: prompt.trim(),
platform,
language: language.trim(),
projectId,
requirements: Object.freeze([...requirements])
});
}

export function createAppResponse({
success,
requestId = null,
projectId = null,
data = null,
error = null
} = {}) {
if (typeof success !== "boolean") {
throw new TypeError("Statusi success duhet të jetë boolean.");
}

if (
requestId !== null &&
(typeof requestId !== "string" || !requestId.trim())
) {
throw new TypeError("Identifikuesi i kërkesës është i pavlefshëm.");
}

if (
projectId !== null &&
(typeof projectId !== "string" || !projectId.trim())
) {
throw new TypeError("Identifikuesi i projektit është i pavlefshëm.");
}

if (success && error !== null) {
throw new TypeError("Përgjigjja e suksesshme nuk mund të ketë gabim.");
}

if (!success && !isValidError(error)) {
throw new TypeError("Përgjigjja e dështuar duhet të ketë gabim të vlefshëm.");
}

return Object.freeze({
contractVersion: XSUS_APP_CONTRACT_VERSION,
success,
requestId,
projectId,
data,
error
});
}

export function isAppRequest(value) {
return Boolean(
value &&
typeof value === "object" &&
!Array.isArray(value) &&
value.contractVersion === XSUS_APP_CONTRACT_VERSION &&
APP_REQUEST_TYPES.includes(value.type) &&
typeof value.prompt === "string" &&
value.prompt.trim().length > 0 &&
APP_PLATFORMS.includes(value.platform) &&
typeof value.language === "string" &&
value.language.trim().length > 0 &&
(
value.projectId === null ||
(
typeof value.projectId === "string" &&
value.projectId.trim().length > 0
)
) &&
Array.isArray(value.requirements)
);
}

export function isAppResponse(value) {
return Boolean(
value &&
typeof value === "object" &&
!Array.isArray(value) &&
value.contractVersion === XSUS_APP_CONTRACT_VERSION &&
typeof value.success === "boolean" &&
(
value.requestId === null ||
typeof value.requestId === "string"
) &&
(
value.projectId === null ||
typeof value.projectId === "string"
) &&
(
value.success
? value.error === null
: isValidError(value.error)
)
);
}
