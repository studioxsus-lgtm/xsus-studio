
/**
 * XSUS AI Core — Memory Integrity
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Kontrollon strukturën e snapshot-it të memories.
 * - Verifikon identitetin dhe përmbajtjen e mesazheve.
 * - Zbulon ID të dyfishta dhe fusha të pavlefshme.
 * - Nuk ndryshon dhe nuk fshin të dhëna.
 */

export const MEMORY_INTEGRITY_VERSION = "1.0.0";

const VALID_ROLES = new Set(["user", "assistant"]);

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidTimestamp(value) {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return Number.isFinite(Date.parse(value));
  }

  return false;
}

function addIssue(issues, code, path, message) {
  issues.push({ code, path, message });
}

/**
 * Kontrollon një mesazh të memories.
 */
export function inspectMemoryMessage(message, path = "message") {
  const issues = [];

  if (
    !message ||
    typeof message !== "object" ||
    Array.isArray(message)
  ) {
    addIssue(
      issues,
      "INVALID_MESSAGE",
      path,
      "Mesazhi duhet të jetë objekt."
    );

    return { valid: false, issues };
  }

  if (!isNonEmptyString(message.id)) {
    addIssue(
      issues,
      "INVALID_MESSAGE_ID",
      `${path}.id`,
      "ID e mesazhit mungon ose është e pavlefshme."
    );
  }

  if (!VALID_ROLES.has(message.role)) {
    addIssue(
      issues,
      "INVALID_MESSAGE_ROLE",
      `${path}.role`,
      "Roli duhet të jetë user ose assistant."
    );
  }

  if (!isNonEmptyString(message.content)) {
    addIssue(
      issues,
      "INVALID_MESSAGE_CONTENT",
      `${path}.content`,
      "Përmbajtja e mesazhit mungon ose është bosh."
    );
  }

  if (!isValidTimestamp(message.timestamp)) {
    addIssue(
      issues,
      "INVALID_MESSAGE_TIMESTAMP",
      `${path}.timestamp`,
      "Koha e mesazhit duhet të jetë numër ose datë e vlefshme."
    );
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Kontrollon një snapshot të eksportuar nga memory-engine.js.
 * Nuk e ndryshon snapshot-in.
 */
export function inspectMemorySnapshot(snapshot) {
  const issues = [];

  if (
    !snapshot ||
    typeof snapshot !== "object" ||
    Array.isArray(snapshot)
  ) {
    addIssue(
      issues,
      "INVALID_SNAPSHOT",
      "snapshot",
      "Snapshot-i duhet të jetë objekt."
    );

    return { valid: false, issues };
  }

  if (snapshot.schemaVersion !== 1) {
    addIssue(
      issues,
      "UNSUPPORTED_SCHEMA_VERSION",
      "snapshot.schemaVersion",
      "Versioni i skemës nuk mbështetet."
    );
  }

  if (!isNonEmptyString(snapshot.engineVersion)) {
    addIssue(
      issues,
      "INVALID_ENGINE_VERSION",
      "snapshot.engineVersion",
      "Versioni i motorit mungon ose është i pavlefshëm."
    );
  }

  if (!isValidTimestamp(snapshot.exportedAt)) {
    addIssue(
      issues,
      "INVALID_EXPORT_TIMESTAMP",
      "snapshot.exportedAt",
      "Data e eksportimit mungon ose është e pavlefshme."
    );
  }

  const session = snapshot.session;

  if (
    !session ||
    typeof session !== "object" ||
    Array.isArray(session)
  ) {
    addIssue(
      issues,
      "INVALID_SESSION",
      "snapshot.session",
      "Snapshot-i duhet të përmbajë një sesion të vlefshëm."
    );

    return { valid: false, issues };
  }

  if (!isNonEmptyString(session.sessionId)) {
    addIssue(
      issues,
      "INVALID_SESSION_ID",
      "snapshot.session.sessionId",
      "ID e sesionit mungon ose është e pavlefshme."
    );
  }

  for (const field of [
    "createdAt",
    "updatedAt",
    "lastAccessedAt",
  ]) {
    if (!isValidTimestamp(session[field])) {
      addIssue(
        issues,
        "INVALID_SESSION_TIMESTAMP",
        `snapshot.session.${field}`,
        `Fusha ${field} mungon ose ka datë të pavlefshme.`
      );
    }
  }

  if (
    session.metadata !== undefined &&
    (
      session.metadata === null ||
      typeof session.metadata !== "object" ||
      Array.isArray(session.metadata)
    )
  ) {
    addIssue(
      issues,
      "INVALID_SESSION_METADATA",
      "snapshot.session.metadata",
      "Metadata duhet të jetë objekt."
    );
  }

  if (!Array.isArray(session.messages)) {
    addIssue(
      issues,
      "INVALID_MESSAGES_COLLECTION",
      "snapshot.session.messages",
      "Mesazhet duhet të jenë një listë."
    );

    return { valid: false, issues };
  }

  const messageIds = new Set();

  session.messages.forEach((message, index) => {
    const path = `snapshot.session.messages[${index}]`;
    const result = inspectMemoryMessage(message, path);

    issues.push(...result.issues);

    if (
      message &&
      typeof message === "object" &&
      isNonEmptyString(message.id)
    ) {
      if (messageIds.has(message.id)) {
        addIssue(
          issues,
          "DUPLICATE_MESSAGE_ID",
          `${path}.id`,
          "ID e mesazhit përsëritet brenda sesionit."
        );
      } else {
        messageIds.add(message.id);
      }
    }
  });

  return {
    valid: issues.length === 0,
    issues,
  };
}
