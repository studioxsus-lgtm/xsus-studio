
/**
 * XSUS App — Project Builder
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Përgatitja e projektit për build.
 * - Kontrolli i skedarëve hyrës.
 * - Validimi i strukturës bazë.
 * - Krijimi i manifestit të build-it.
 *
 * Ky modul nuk ekzekuton ende kompilim real.
 */

export const APP_PROJECT_BUILDER_VERSION = "1.0.0";

export const APP_BUILD_ERROR_CODES = Object.freeze({
  INVALID_INPUT: "INVALID_INPUT",
  INVALID_PROJECT: "INVALID_PROJECT",
  EMPTY_PROJECT: "EMPTY_PROJECT",
  INVALID_FILES: "INVALID_FILES",
});

const SUPPORTED_PLATFORMS = Object.freeze([
  "web",
  "android",
  "ios",
  "desktop",
]);

function createError(code, message) {
  return {
    success: false,
    error: { code, message },
  };
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validateFiles(files) {
  if (!Array.isArray(files)) {
    return false;
  }

  return files.every((file) => {
    return (
      file &&
      typeof file === "object" &&
      typeof file.path === "string" &&
      file.path.trim().length > 0 &&
      typeof file.content === "string"
    );
  });
}

function createBuildId() {
  return `xsus-build-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function prepareProjectBuild(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return createError(
      APP_BUILD_ERROR_CODES.INVALID_INPUT,
      "Të dhënat e build-it nuk janë të vlefshme."
    );
  }

  const project = input.project;
  const files = input.files;
  const platform = normalizeText(input.platform).toLowerCase();

  if (
    !project ||
    typeof project !== "object" ||
    !normalizeText(project.id) ||
    !normalizeText(project.name)
  ) {
    return createError(
      APP_BUILD_ERROR_CODES.INVALID_PROJECT,
      "Projekti nuk ka identitet ose emër të vlefshëm."
    );
  }

  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    return createError(
      APP_BUILD_ERROR_CODES.INVALID_INPUT,
      "Platforma nuk mbështetet."
    );
  }

  if (!validateFiles(files)) {
    return createError(
      APP_BUILD_ERROR_CODES.INVALID_FILES,
      "Lista e skedarëve nuk është e vlefshme."
    );
  }

  if (files.length === 0) {
    return createError(
      APP_BUILD_ERROR_CODES.EMPTY_PROJECT,
      "Projekti nuk përmban skedarë për build."
    );
  }

  const paths = new Set();

  for (const file of files) {
    const path = file.path.trim().replace(/\\/g, "/");

    if (
      path.startsWith("/") ||
      path.split("/").some(
        (segment) => !segment || segment === "." || segment === ".."
      )
    ) {
      return createError(
        APP_BUILD_ERROR_CODES.INVALID_FILES,
        "Projekti përmban një rrugë skedari të pavlefshme."
      );
    }

    if (paths.has(path)) {
      return createError(
        APP_BUILD_ERROR_CODES.INVALID_FILES,
        "Projekti përmban rrugë të përsëritura skedarësh."
      );
    }

    paths.add(path);
  }

  const buildId = createBuildId();
  const createdAt = new Date().toISOString();

  const manifest = {
    buildId,
    projectId: project.id,
    projectName: project.name,
    platform,
    fileCount: files.length,
    files: files.map((file) => ({
      path: file.path.trim().replace(/\\/g, "/"),
      size: new TextEncoder().encode(file.content).length,
    })),
    createdAt,
    status: "prepared",
  };

  return {
    success: true,
    manifest,
    metadata: {
      version: APP_PROJECT_BUILDER_VERSION,
      compilationPerformed: false,
    },
  };
}

export function getProjectBuilderCapabilities() {
  return Object.freeze({
    version: APP_PROJECT_BUILDER_VERSION,
    operations: ["prepare"],
    platforms: [...SUPPORTED_PLATFORMS],
    compilation: false,
  });
}
