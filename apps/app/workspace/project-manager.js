
/**
 * XSUS App — Project Manager
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Krijimi i projekteve.
 * - Listimi dhe kërkimi i projekteve.
 * - Përditësimi i të dhënave të projektit.
 * - Fshirja e projekteve.
 *
 * Shënim:
 * Ky version përdor ruajtje në RAM.
 * Persistenca do të integrohet veçmas.
 */

export const APP_PROJECT_MANAGER_VERSION = "1.0.0";

export const APP_PROJECT_STATUSES = Object.freeze([
  "created",
  "in-progress",
  "completed",
  "archived",
]);

export const APP_PROJECT_PLATFORMS = Object.freeze([
  "web",
  "android",
  "ios",
  "desktop",
]);

export const APP_PROJECT_ERROR_CODES = Object.freeze({
  INVALID_PROJECT: "INVALID_PROJECT",
  PROJECT_NOT_FOUND: "PROJECT_NOT_FOUND",
  DUPLICATE_PROJECT: "DUPLICATE_PROJECT",
  INVALID_UPDATE: "INVALID_UPDATE",
});

const projects = new Map();

function createProjectId() {
  return `xsus-app-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function createError(code, message) {
  return {
    success: false,
    error: {
      code,
      message,
    },
  };
}

function cloneProject(project) {
  return {
    ...project,
    metadata: { ...project.metadata },
  };
}

export function createProject(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return createError(
      APP_PROJECT_ERROR_CODES.INVALID_PROJECT,
      "Të dhënat e projektit nuk janë të vlefshme."
    );
  }

  const name = normalizeText(input.name);
  const description = normalizeText(input.description);
  const platform = normalizeText(input.platform).toLowerCase();

  if (!name) {
    return createError(
      APP_PROJECT_ERROR_CODES.INVALID_PROJECT,
      "Emri i projektit është i detyrueshëm."
    );
  }

  if (!APP_PROJECT_PLATFORMS.includes(platform)) {
    return createError(
      APP_PROJECT_ERROR_CODES.INVALID_PROJECT,
      "Platforma e zgjedhur nuk mbështetet."
    );
  }

  const id = normalizeText(input.id) || createProjectId();

  if (projects.has(id)) {
    return createError(
      APP_PROJECT_ERROR_CODES.DUPLICATE_PROJECT,
      "Ekziston një projekt me këtë identifikues."
    );
  }

  const now = new Date().toISOString();

  const project = {
    id,
    name,
    description,
    platform,
    status: "created",
    createdAt: now,
    updatedAt: now,
    metadata:
      input.metadata &&
      typeof input.metadata === "object" &&
      !Array.isArray(input.metadata)
        ? { ...input.metadata }
        : {},
  };

  projects.set(id, project);

  return {
    success: true,
    project: cloneProject(project),
  };
}

export function getProject(projectId) {
  const id = normalizeText(projectId);
  const project = projects.get(id);

  if (!project) {
    return createError(
      APP_PROJECT_ERROR_CODES.PROJECT_NOT_FOUND,
      "Projekti nuk u gjet."
    );
  }

  return {
    success: true,
    project: cloneProject(project),
  };
}

export function listProjects(options = {}) {
  const status = normalizeText(options.status);
  const platform = normalizeText(options.platform).toLowerCase();

  let result = Array.from(projects.values());

  if (status) {
    result = result.filter((project) => project.status === status);
  }

  if (platform) {
    result = result.filter((project) => project.platform === platform);
  }

  result.sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );

  return {
    success: true,
    projects: result.map(cloneProject),
    total: result.length,
  };
}

export function updateProject(projectId, updates = {}) {
  const id = normalizeText(projectId);
  const project = projects.get(id);

  if (!project) {
    return createError(
      APP_PROJECT_ERROR_CODES.PROJECT_NOT_FOUND,
      "Projekti nuk u gjet."
    );
  }

  if (
    !updates ||
    typeof updates !== "object" ||
    Array.isArray(updates)
  ) {
    return createError(
      APP_PROJECT_ERROR_CODES.INVALID_UPDATE,
      "Të dhënat për përditësim nuk janë të vlefshme."
    );
  }

  const allowedFields = [
    "name",
    "description",
    "status",
    "metadata",
  ];

  const unknownFields = Object.keys(updates).filter(
    (key) => !allowedFields.includes(key)
  );

  if (unknownFields.length > 0) {
    return createError(
      APP_PROJECT_ERROR_CODES.INVALID_UPDATE,
      "Përmban fusha që nuk mund të përditësohen."
    );
  }

  const next = { ...project };

  if (Object.hasOwn(updates, "name")) {
    const name = normalizeText(updates.name);

    if (!name) {
      return createError(
        APP_PROJECT_ERROR_CODES.INVALID_UPDATE,
        "Emri i projektit nuk mund të jetë bosh."
      );
    }

    next.name = name;
  }

  if (Object.hasOwn(updates, "description")) {
    if (typeof updates.description !== "string") {
      return createError(
        APP_PROJECT_ERROR_CODES.INVALID_UPDATE,
        "Përshkrimi duhet të jetë tekst."
      );
    }

    next.description = updates.description.trim();
  }

  if (Object.hasOwn(updates, "status")) {
    if (!APP_PROJECT_STATUSES.includes(updates.status)) {
      return createError(
        APP_PROJECT_ERROR_CODES.INVALID_UPDATE,
        "Statusi i projektit nuk është i vlefshëm."
      );
    }

    next.status = updates.status;
  }

  if (Object.hasOwn(updates, "metadata")) {
    if (
      !updates.metadata ||
      typeof updates.metadata !== "object" ||
      Array.isArray(updates.metadata)
    ) {
      return createError(
        APP_PROJECT_ERROR_CODES.INVALID_UPDATE,
        "Metadata duhet të jetë objekt."
      );
    }

    next.metadata = { ...updates.metadata };
  }

  next.updatedAt = new Date().toISOString();

  projects.set(id, next);

  return {
    success: true,
    project: cloneProject(next),
  };
}

export function deleteProject(projectId) {
  const id = normalizeText(projectId);

  if (!projects.has(id)) {
    return createError(
      APP_PROJECT_ERROR_CODES.PROJECT_NOT_FOUND,
      "Projekti nuk u gjet."
    );
  }

  projects.delete(id);

  return {
    success: true,
    deletedId: id,
  };
}

export function clearProjects() {
  const deletedCount = projects.size;
  projects.clear();

  return {
    success: true,
    deletedCount,
  };
}

export function getProjectManagerCapabilities() {
  return Object.freeze({
    version: APP_PROJECT_MANAGER_VERSION,
    storage: "memory",
    operations: [
      "create",
      "get",
      "list",
      "update",
      "delete",
      "clear",
    ],
    platforms: [...APP_PROJECT_PLATFORMS],
    statuses: [...APP_PROJECT_STATUSES],
  });
}
