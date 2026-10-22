
/**
 * XSUS AI Core — Memory Diagnostics
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Kontrolli strukturor i snapshot-eve të memories.
 * - Zbulimi i të dhënave të pavlefshme.
 * - Raportimi me kode të standardizuara.
 * - Kontrolli opsional i identitetit të sesionit.
 *
 * Ky modul është vetëm diagnostikues:
 * nuk fshin, nuk riparon dhe nuk mbishkruan të dhëna.
 */

export const MEMORY_DIAGNOSTICS_VERSION = "1.0.0";

export const MEMORY_DIAGNOSTIC_CODES = Object.freeze({
  INVALID_SNAPSHOT: "MEMORY_INVALID_SNAPSHOT",
  INVALID_SESSION_ID: "MEMORY_INVALID_SESSION_ID",
  SESSION_ID_MISMATCH: "MEMORY_SESSION_ID_MISMATCH",
  INVALID_MESSAGES: "MEMORY_INVALID_MESSAGES",
  INVALID_MESSAGE: "MEMORY_INVALID_MESSAGE",
  INVALID_TIMESTAMP: "MEMORY_INVALID_TIMESTAMP",
  NON_SERIALIZABLE_DATA: "MEMORY_NON_SERIALIZABLE_DATA",
  INVALID_STORAGE: "MEMORY_INVALID_STORAGE",
  STORAGE_READ_FAILED: "MEMORY_STORAGE_READ_FAILED"
});

function createIssue(code, message, path = "$") {
  return { code, message, path };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function isValidSessionId(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidTimestamp(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0;
  }

  if (typeof value === "string" && value.trim() !== "") {
    return !Number.isNaN(Date.parse(value));
  }

  return false;
}

/**
 * Kontrollon nëse një vlerë mund të serializohet si JSON.
 */
export function checkJSONSerializable(value) {
  try {
    const serialized = JSON.stringify(value);

    if (serialized === undefined) {
      return {
        valid: false,
        code: MEMORY_DIAGNOSTIC_CODES.NON_SERIALIZABLE_DATA,
        message: "Vlera nuk mund të serializohet si JSON."
      };
    }

    JSON.parse(serialized);

    return {
      valid: true,
      code: null,
      message: null
    };
  } catch (error) {
    return {
      valid: false,
      code: MEMORY_DIAGNOSTIC_CODES.NON_SERIALIZABLE_DATA,
      message: error instanceof Error
        ? error.message
        : "Gabim gjatë serializimit JSON."
    };
  }
}

/**
 * Diagnostikon një snapshot memorieje.
 *
 * Formati i pranuar:
 * {
 *   sessionId?: string,
 *   id?: string,
 *   messages?: Array<{
 *     role?: string,
 *     content?: string,
 *     timestamp?: string | number
 *   }>
 * }
 *
 * sessionId dhe id janë opsionale, por nëse ekzistojnë
 * duhet të jenë vargje jo bosh.
 *
 * Mesazhet kontrollohen kur fusha messages ekziston.
 */
export function diagnoseMemorySnapshot(
  snapshot,
  { expectedSessionId } = {}
) {
  const issues = [];

  if (!isPlainObject(snapshot)) {
    issues.push(
      createIssue(
        MEMORY_DIAGNOSTIC_CODES.INVALID_SNAPSHOT,
        "Snapshot duhet të jetë një objekt i thjeshtë JSON."
      )
    );

    return createReport(issues);
  }

  const serializability = checkJSONSerializable(snapshot);

  if (!serializability.valid) {
    issues.push(
      createIssue(
        serializability.code,
        serializability.message
      )
    );

    return createReport(issues);
  }

  for (const field of ["sessionId", "id"]) {
    if (
      Object.hasOwn(snapshot, field) &&
      !isValidSessionId(snapshot[field])
    ) {
      issues.push(
        createIssue(
          MEMORY_DIAGNOSTIC_CODES.INVALID_SESSION_ID,
          `Fusha ${field} duhet të jetë një varg jo bosh.`,
          `$.${field}`
        )
      );
    }
  }

  const actualSessionId =
    typeof snapshot.sessionId === "string"
      ? snapshot.sessionId
      : typeof snapshot.id === "string"
        ? snapshot.id
        : null;

  if (expectedSessionId !== undefined) {
    if (!isValidSessionId(expectedSessionId)) {
      issues.push(
        createIssue(
          MEMORY_DIAGNOSTIC_CODES.INVALID_SESSION_ID,
          "expectedSessionId duhet të jetë një varg jo bosh.",
          "$.expectedSessionId"
        )
      );
    } else if (
      actualSessionId !== null &&
      actualSessionId !== expectedSessionId
    ) {
      issues.push(
        createIssue(
          MEMORY_DIAGNOSTIC_CODES.SESSION_ID_MISMATCH,
          "Identiteti i sesionit nuk përputhet me atë të pritur.",
          "$.sessionId"
        )
      );
    }
  }

  if (Object.hasOwn(snapshot, "messages")) {
    if (!Array.isArray(snapshot.messages)) {
      issues.push(
        createIssue(
          MEMORY_DIAGNOSTIC_CODES.INVALID_MESSAGES,
          "Fusha messages duhet të jetë një listë.",
          "$.messages"
        )
      );
    } else {
      snapshot.messages.forEach((message, index) => {
        const path = `$.messages[${index}]`;

        if (!isPlainObject(message)) {
          issues.push(
            createIssue(
              MEMORY_DIAGNOSTIC_CODES.INVALID_MESSAGE,
              "Mesazhi duhet të jetë një objekt.",
              path
            )
          );

          return;
        }

        if (
          Object.hasOwn(message, "role") &&
          (
            typeof message.role !== "string" ||
            message.role.trim() === ""
          )
        ) {
          issues.push(
            createIssue(
              MEMORY_DIAGNOSTIC_CODES.INVALID_MESSAGE,
              "Roli i mesazhit duhet të jetë një varg jo bosh.",
              `${path}.role`
            )
          );
        }

        if (
          Object.hasOwn(message, "content") &&
          typeof message.content !== "string"
        ) {
          issues.push(
            createIssue(
              MEMORY_DIAGNOSTIC_CODES.INVALID_MESSAGE,
              "Përmbajtja e mesazhit duhet të jetë tekst.",
              `${path}.content`
            )
          );
        }

        if (
          Object.hasOwn(message, "timestamp") &&
          !isValidTimestamp(message.timestamp)
        ) {
          issues.push(
            createIssue(
              MEMORY_DIAGNOSTIC_CODES.INVALID_TIMESTAMP,
              "Timestamp duhet të jetë numër i vlefshëm ose datë e lexueshme.",
              `${path}.timestamp`
            )
          );
        }
      });
    }
  }

  return createReport(issues);
}

function createReport(issues) {
  return {
    version: MEMORY_DIAGNOSTICS_VERSION,
    valid: issues.length === 0,
    status: issues.length === 0 ? "healthy" : "invalid",
    issueCount: issues.length,
    issues
  };
}

/**
 * Kontrollon nëse një objekt storage ka metodat bazë
 * të leximit dhe shkrimit.
 */
export function diagnoseMemoryStorage(storage) {
  const issues = [];

  if (
    !storage ||
    typeof storage.get !== "function" ||
    typeof storage.set !== "function" ||
    typeof storage.delete !== "function"
  ) {
    issues.push(
      createIssue(
        MEMORY_DIAGNOSTIC_CODES.INVALID_STORAGE,
        "Storage duhet të ofrojë metodat get, set dhe delete."
      )
    );
  }

  return createReport(issues);
}

/**
 * Lexon dhe diagnostikon një snapshot nga storage.
 * Ky funksion nuk modifikon të dhënat.
 */
export async function diagnoseStoredMemory(
  storage,
  key,
  options = {}
) {
  const storageReport = diagnoseMemoryStorage(storage);

  if (!storageReport.valid) {
    return {
      ...storageReport,
      snapshot: null
    };
  }

  if (!isValidSessionId(key)) {
    return {
      ...createReport([
        createIssue(
          MEMORY_DIAGNOSTIC_CODES.INVALID_SESSION_ID,
          "Çelësi i storage duhet të jetë një varg jo bosh.",
          "$.key"
        )
      ]),
      snapshot: null
    };
  }

  let snapshot;

  try {
    snapshot = await storage.get(key);
  } catch (error) {
    return {
      ...createReport([
        createIssue(
          MEMORY_DIAGNOSTIC_CODES.STORAGE_READ_FAILED,
          error instanceof Error
            ? error.message
            : "Nuk mund të lexohet snapshot-i nga storage.",
          "$.storage"
        )
      ]),
      snapshot: null
    };
  }

  if (snapshot === null || snapshot === undefined) {
    return {
      ...createReport([
        createIssue(
          MEMORY_DIAGNOSTIC_CODES.INVALID_SNAPSHOT,
          "Nuk u gjet asnjë snapshot për çelësin e kërkuar.",
          "$.snapshot"
        )
      ]),
      snapshot: null
    };
  }

  const report = diagnoseMemorySnapshot(snapshot, options);

  return {
    ...report,
    snapshot
  };
}
