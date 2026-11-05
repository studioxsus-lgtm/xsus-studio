/**
• XSUS App — Frontend Builder
• Version: 1.0.0
• Independent frontend structure and UI generation module.
• Uses an injected provider; no direct dependency on XSUS AI Core.
*/

export const APP_FRONTEND_BUILDER_VERSION = "1.0.0";

export const APP_FRONTEND_CAPABILITIES = Object.freeze([
"frontend-architecture",
"page-structure",
"component-planning",
"responsive-design",
"frontend-code-generation"
]);

export const APP_FRONTEND_FRAMEWORKS = Object.freeze([
"html",
"react",
"next",
"vue",
"angular",
"svelte"
]);

const DEFAULT_CONFIG = Object.freeze({
maxPromptLength: 12000,
maxFiles: 100,
defaultFramework: "react"
});

function createError(code, message) {
return {
success: false,
error: { code, message }
};
}

function normalizeRequest(request) {
if (!request || typeof request !== "object" || Array.isArray(request)) {
return null;
}

const prompt =
typeof request.prompt === "string"
? request.prompt.trim()
: "";

if (!prompt) return null;

return {
prompt,
framework: request.framework || DEFAULT_CONFIG.defaultFramework,
styling: request.styling || "css",
responsive: request.responsive !== false,
requirements: Array.isArray(request.requirements)
? [...request.requirements]
: []
};
}

function validateRequest(request, config) {
if (!request) {
return createError(
"INVALID_REQUEST",
"A valid frontend request is required."
);
}

if (request.prompt.length > config.maxPromptLength) {
return createError(
"PROMPT_TOO_LONG",
"The frontend prompt exceeds the allowed length."
);
}

if (!APP_FRONTEND_FRAMEWORKS.includes(request.framework)) {
return createError(
"UNSUPPORTED_FRAMEWORK",
Unsupported frontend framework: ${request.framework}`
);
}

return null;
}

function validateArtifacts(artifacts, maxFiles) {
if (!Array.isArray(artifacts)) {
return createError(
"INVALID_ARTIFACTS",
"The provider must return an artifacts array."
);
}

if (artifacts.length > maxFiles) {
return createError(
"FILE_LIMIT_EXCEEDED",
"The frontend project exceeds the maximum file count."
);
}

const normalized = [];
const fileNames = new Set();

for (const artifact of artifacts) {
if (
!artifact ||
typeof artifact.fileName !== "string" ||
!artifact.fileName.trim() ||
typeof artifact.content !== "string"
) {
return createError(
"INVALID_ARTIFACT",
"Every artifact must contain a fileName and content."
);
}

const fileName = artifact.fileName.trim();

if (
fileName.startsWith("/") ||
fileName.includes("\") ||
fileName.split("/").includes("..")
) {
return createError(
"INVALID_FILE_PATH",
"Artifact paths must remain inside the project."
);
}

if (fileNames.has(fileName)) {
return createError(
"DUPLICATE_FILE",
Duplicate frontend file:${fileName}`
);
}

fileNames.add(fileName);

normalized.push(
Object.freeze({
fileName,
content: artifact.content,
type: "frontend"
})
);
}

return {
success: true,
artifacts: Object.freeze(normalized)
};
}

export function createFrontendBuilder(options = {}) {
const config = Object.freeze({
...DEFAULT_CONFIG,
...options.config
});

const provider = options.provider || null;

async function build(request) {
const normalized = normalizeRequest(request);
const validationError = validateRequest(normalized, config);

if (validationError) return validationError;

if (!provider || typeof provider.generate !== "function") {
return createError(
"FRONTEND_PROVIDER_UNAVAILABLE",
"No frontend generation provider has been configured."
);
}

try {
const result = await provider.generate({
prompt: normalized.prompt,
framework: normalized.framework,
styling: normalized.styling,
responsive: normalized.responsive,
requirements: normalized.requirements
});

if (!result || typeof result !== "object") {
return createError(
"INVALID_PROVIDER_RESPONSE",
"The frontend provider returned an invalid response."
);
}

const validation = validateArtifacts(
result.artifacts,
config.maxFiles
);

if (!validation.success) return validation;

return Object.freeze({
success: true,
data: Object.freeze({
framework: normalized.framework,
styling: normalized.styling,
responsive: normalized.responsive,
artifacts: validation.artifacts
}),
metadata: Object.freeze({
builderVersion: APP_FRONTEND_BUILDER_VERSION,
artifactCount: validation.artifacts.length
})
});
} catch {
return createError(
"FRONTEND_BUILD_FAILED",
"Frontend generation failed. Please try again."
);
}
}

return Object.freeze({
name: "XSUS App Frontend Builder",
version: APP_FRONTEND_BUILDER_VERSION,
capabilities: APP_FRONTEND_CAPABILITIES,
build
});
}
