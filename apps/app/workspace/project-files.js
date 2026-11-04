
/**
 * XSUS App — Project Files Manager
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Krijimi i skedarëve brenda projekteve.
 * - Leximi dhe listimi i skedarëve.
 * - Përditësimi dhe fshirja e skedarëve.
 * - Kontrolli i emrave dhe rrugëve të skedarëve.
 *
 * Shënim:
 * Ky version përdor ruajtje në RAM.
 * Ruajtja në disk ose cloud do të integrohet veçmas.
 */

export const APP_PROJECT_FILES_VERSION = "1.0.0";

export const APP_PROJECT_FILES_LIMITS = Object.freeze({
  maxFilesPerProject: 1000,
  maxFileSize: 1024 * 1024,
  maxPathLength: 240,
});

export const APP_PROJECT_FILES_ERROR_CODES = Object.freeze({
  INVALID_INPUT: "INVALID_INPUT",
  INVALID_PATH: "INVALID_PATH",
  FILE_NOT_FOUND: "FILE_NOT_FOUND",
  FILE_ALREADY_EXISTS: "FILE_ALREADY_EXISTS",
  PROJECT_LIMIT_REACHED: "PROJECT_LIMIT_REACHED",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
});

const projectFiles = new Map();

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function createError(code, message) {
  return {
    success: false,
    error: { code, message },
  };
}

function getProjectStorage(projectId) {
  const id = normalizeText(projectId);

  if (!id) return null;

  if (!projectFiles.has(id)) {
    projectFiles.set(id, new Map());
  }

  return projectFiles.get(id);
}

function normalizePath(path) {
  if (typeof path !== "string") return null;

  const normalized = path
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  if (
    !normalized ||
    normalized.length > APP_PROJECT_FILES_LIMITS.maxPathLength ||
    normalized.includes("\0")
  ) {
    return null;
  }

  const segments = normalized.split("/");

  if (
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        segment.includes(":")
    )
  ) {
    return null;
  }

  return normalized;
}

function cloneFile(file) {
  return {
    path: file.path,
    content: file.content,
    size: file.size,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  };
}

function getContentSize(content) {
  return new TextEncoder().encode(content).length;
}

export function createProjectFile(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return createError(
      APP_PROJECT_FILES_ERROR_CODES.INVALID_INPUT,
      "Të dhënat e skedarit nuk janë të vlefshme."
    );
  }

  const projectId = normalizeText(input.projectId);
  const path = normalizePath(input.path);

  if (!projectId || !path || typeof input.content !== "string") {
    return createError(
      APP_PROJECT_FILES_ERROR_CODES.INVALID_INPUT,
      "Project ID, path dhe content janë të detyrueshme."
    );
  }

  if (!normalizePath(input.path)) {
    return createError(
      APP_PROJECT_FILES_ERROR_CODES.INVALID_PATH,
      "Rruga e skedarit nuk është e vlefshme."
    );
  }

  const size = getContentSize(input.content);

  if (size > APP_PROJECT_FILES_LIMITS.maxFileSize) {
    return createError(
      APP_PROJECT_FILES_ERROR_CODES.FILE_TOO_LARGE,
      "Skedari tejkalon madhësinë maksimale prej 1 MB."
    );
  }

  const files = getProjectStorage(projectId);

  if (files.has(path)) {
    return createError(
      APP_PROJECT_FILES_ERROR_CODES.FILE_ALREADY_EXISTS,
      "Ekziston tashmë një skedar me këtë rrugë."
    );
  }

  if (files.size >= APP_PROJECT_FILES_LIMITS.maxFilesPerProject) {
    return createError(
      APP_PROJECT_FILES_ERROR_CODES.PROJECT_LIMIT_REACHED,
      "Projekti ka arritur numrin maksimal të skedarëve."
    );
  }

  const now = new Date().toISOString();

  const file = {
    path,
    content: input.content,
    size,
    createdAt: now,
    updatedAt: now,
  };

  files.set(path, file);

  return {
    success: true,
    file: cloneFile(file),
  };
}

export function getProjectFile(projectId, filePath) {
  const id = normalizeText(projectId);
  const path = normalizePath(filePath);
  const files = projectFiles.get(id);

  if (!path || !files || !files.has(path)) {
    return createError(
      APP_PROJECT_FILES_ERROR_CODES.FILE_NOT_FOUND,
      "Skedari nuk u gjet."
    );
  }

  return {
    success: true,
    file: cloneFile(files.get(path)),
  };
}

export function listProjectFiles(projectId) {
  const id = normalizeText(projectId);
  const files = projectFiles.get(id);

  const result = files
    ? Array.from(files.values())
        .sort((a, b) => a.path.localeCompare(b.path))
        .map(cloneFile)
    : [];

  return {
    success: true,
    files: result,
    total: result.length,
  };
}

export function updateProjectFile(projectId, filePath, content) {
  const id = normalizeText(projectId);
  const path = normalizePath(filePath);
  const files = projectFiles.get(id);

  if (!path || !files || !files.has(path)) {
    return createError(
      APP_PROJECT_FILES_ERROR_CODES.FILE_NOT_FOUND,
      "Skedari nuk u gjet."
    );
  }

  if (typeof content !== "string") {
    return createError(
      APP_PROJECT_FILES_ERROR_CODES.INVALID_INPUT,
      "Përmbajtja e skedarit duhet të jetë tekst."
    );
  }

  const size = getContentSize(content);

  if (size > APP_PROJECT_FILES_LIMITS.maxFileSize) {
    return createError(
      APP_PROJECT_FILES_ERROR_CODES.FILE_TOO_LARGE,
      "Skedari tejkalon madhësinë maksimale prej 1 MB."
    );
  }

  const current = files.get(path);

  const updated = {
    ...current,
    content,
    size,
    updatedAt: new Date().toISOString(),
  };

  files.set(path, updated);

  return {
    success: true,
    file: cloneFile(updated),
  };
}

export function deleteProjectFile(projectId, filePath) {
  const id = normalizeText(projectId);
  const path = normalizePath(filePath);
  const files = projectFiles.get(id);

  if (!path || !files || !files.has(path)) {
    return createError(
      APP_PROJECT_FILES_ERROR_CODES.FILE_NOT_FOUND,
      "Skedari nuk u gjet."
    );
  }

  files.delete(path);

  return {
    success: true,
    deletedPath: path,
  };
}

export function deleteProjectFiles(projectId) {
  const id = normalizeText(projectId);
  const files = projectFiles.get(id);

  if (!files) {
    return {
      success: true,
      deletedCount: 0,
    };
  }

  const deletedCount = files.size;
  projectFiles.delete(id);

  return {
    success: true,
    deletedCount,
  };
}

export function getProjectFilesCapabilities() {
  return Object.freeze({
    version: APP_PROJECT_FILES_VERSION,
    storage: "memory",
    operations: [
      "create",
      "get",
      "list",
      "update",
      "delete",
      "delete-project-files",
    ],
    limits: { ...APP_PROJECT_FILES_LIMITS },
  });
}
