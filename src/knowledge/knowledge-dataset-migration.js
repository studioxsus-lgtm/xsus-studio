/**
 * XSUS AI Core — Knowledge Dataset Migration Engine
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Regjistrimi i migrimeve të versioneve.
 * - Kontrolli i versionit burimor dhe atij të synuar.
 * - Migrimi progresiv i dataset-eve.
 * - Validimi para dhe pas migrimit.
 * - Ruajtja e të dhënave origjinale në rast dështimi.
 *
 * Shënim:
 * Ky modul punon mbi kopje të të dhënave.
 * Ai nuk shkruan vetë në storage dhe nuk ndryshon pipeline-in.
 */

const DEFAULT_VERSION = "1.0.0";

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function cloneValue(value) {
  if (typeof structuredClone !== "function") {
    throw new Error(
      "Mjedisi nuk mbështet structuredClone."
    );
  }

  return structuredClone(value);
}

function parseVersion(version) {
  if (typeof version !== "string") {
    return null;
  }

  const match = version.trim().match(
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/
  );

  if (!match) {
    return null;
  }

  return match.slice(1).map(Number);
}

function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);

  if (!a || !b) {
    throw new Error(
      "Versioni duhet të jetë në formatin semver X.Y.Z."
    );
  }

  for (let index = 0; index < 3; index += 1) {
    if (a[index] > b[index]) return 1;
    if (a[index] < b[index]) return -1;
  }

  return 0;
}

function createFailure(message, metadata = {}) {
  return {
    success: false,
    migrated: false,
    error: message,
    metadata
  };
}

function validateDataset(dataset) {
  if (!isPlainObject(dataset)) {
    return {
      valid: false,
      error: "Dataset-i duhet të jetë objekt."
    };
  }

  if (
    typeof dataset.id !== "string" ||
    dataset.id.trim().length === 0
  ) {
    return {
      valid: false,
      error:
        "Dataset-i duhet të ketë një identifikues të vlefshëm."
    };
  }

  if (!Array.isArray(dataset.entries)) {
    return {
      valid: false,
      error:
        "Dataset-i duhet të përmbajë një listë entries."
    };
  }

  const seenIds = new Set();

  for (const entry of dataset.entries) {
    if (!isPlainObject(entry)) {
      return {
        valid: false,
        error: "Çdo hyrje duhet të jetë objekt."
      };
    }

    if (
      typeof entry.id !== "string" ||
      entry.id.trim().length === 0
    ) {
      return {
        valid: false,
        error:
          "Çdo hyrje duhet të ketë një identifikues të vlefshëm."
      };
    }

    if (
      typeof entry.title !== "string" ||
      entry.title.trim().length === 0
    ) {
      return {
        valid: false,
        error:
          `Hyrja "${entry.id}" duhet të ketë një titull të vlefshëm.`
      };
    }

    if (typeof entry.content !== "string") {
      return {
        valid: false,
        error:
          `Përmbajtja e hyrjes "${entry.id}" duhet të jetë tekst.`
      };
    }

    if (seenIds.has(entry.id)) {
      return {
        valid: false,
        error:
          `Identifikues i përsëritur: "${entry.id}".`
      };
    }

    seenIds.add(entry.id);
  }

  return {
    valid: true,
    error: null
  };
}

function normalizeMigrationResult(result) {
  if (Array.isArray(result)) {
    return {
      entries: result
    };
  }

  if (!isPlainObject(result)) {
    throw new Error(
      "Migrimi duhet të kthejë një listë hyrjesh ose objekt me entries."
    );
  }

  return result;
}

function runValidation(validate, dataset) {
  const result = validate(dataset);

  if (!result || result.valid !== true) {
    return {
      valid: false,
      error:
        result?.error ||
        "Dataset-i nuk kalon validimin."
    };
  }

  return {
    valid: true,
    error: null
  };
}

/**
 * Krijon një motor të pavarur migrimi.
 *
 * @param {object} options
 * @param {string} [options.currentVersion="1.0.0"]
 * @param {Function} [options.validateDataset]
 */
export function createKnowledgeDatasetMigration({
  currentVersion = DEFAULT_VERSION,
  validate = validateDataset
} = {}) {
  if (!parseVersion(currentVersion)) {
    throw new TypeError(
      "currentVersion duhet të jetë version semver X.Y.Z."
    );
  }

  if (typeof validate !== "function") {
    throw new TypeError(
      "validate duhet të jetë funksion."
    );
  }

  const migrations = new Map();

  function registerMigration({
    fromVersion,
    toVersion,
    migrate
  } = {}) {
    if (
      !parseVersion(fromVersion) ||
      !parseVersion(toVersion)
    ) {
      throw new TypeError(
        "Versionet e migrimit duhet të jenë në formatin X.Y.Z."
      );
    }

    if (compareVersions(toVersion, fromVersion) <= 0) {
      throw new Error(
        "Versioni i synuar duhet të jetë më i madh se versioni burimor."
      );
    }

    if (typeof migrate !== "function") {
      throw new TypeError(
        "migrate duhet të jetë funksion."
      );
    }

    const key = `${fromVersion}->${toVersion}`;

    if (migrations.has(key)) {
      throw new Error(
        `Migrimi "${key}" është regjistruar tashmë.`
      );
    }

    migrations.set(key, migrate);

    return {
      success: true,
      fromVersion,
      toVersion
    };
  }

  function findNextMigration(version, targetVersion) {
    const candidates = [];

    for (const [key, migrate] of migrations.entries()) {
      const [fromVersion, toVersion] = key.split("->");

      if (
        fromVersion === version &&
        compareVersions(toVersion, targetVersion) <= 0
      ) {
        candidates.push({
          fromVersion,
          toVersion,
          migrate
        });
      }
    }

    candidates.sort((a, b) =>
      compareVersions(a.toVersion, b.toVersion)
    );

    return candidates[0] ?? null;
  }

  async function migrateDataset(
    dataset,
    { targetVersion = currentVersion } = {}
  ) {
    if (!parseVersion(targetVersion)) {
      return createFailure(
        "Versioni i synuar nuk është i vlefshëm."
      );
    }

    if (!isPlainObject(dataset)) {
      return createFailure(
        "Dataset-i duhet të jetë objekt."
      );
    }

    let original;

    try {
      original = cloneValue(dataset);
    } catch (error) {
      return createFailure(
        error instanceof Error
          ? error.message
          : "Dataset-i nuk mund të kopjohet."
      );
    }

    let originalValidation;

    try {
      originalValidation = runValidation(
        validate,
        cloneValue(original)
      );
    } catch (error) {
      return createFailure(
        error instanceof Error
          ? error.message
          : "Validimi i dataset-it burimor dështoi."
      );
    }

    if (!originalValidation.valid) {
      return createFailure(
        originalValidation.error
      );
    }

    const sourceVersion = original.schemaVersion;

    if (!parseVersion(sourceVersion)) {
      return createFailure(
        "Dataset-i nuk ka një schemaVersion të vlefshëm."
      );
    }

    const versionComparison = compareVersions(
      sourceVersion,
      targetVersion
    );

    if (versionComparison > 0) {
      return createFailure(
        "Dataset-i është më i ri se versioni i synuar; migrimi prapa nuk lejohet.",
        {
          sourceVersion,
          targetVersion
        }
      );
    }

    if (versionComparison === 0) {
      return {
        success: true,
        migrated: false,
        dataset: original,
        metadata: {
          sourceVersion,
          targetVersion,
          migrationsApplied: 0
        }
      };
    }

    let workingCopy = cloneValue(original);
    let version = sourceVersion;
    let migrationsApplied = 0;

    try {
      while (compareVersions(version, targetVersion) < 0) {
        const next = findNextMigration(
          version,
          targetVersion
        );

        if (!next) {
          return createFailure(
            `Mungon migrimi nga versioni ${version} drejt ${targetVersion}.`,
            {
              sourceVersion,
              targetVersion,
              currentVersion: version,
              migrationsApplied,
              originalPreserved: true
            }
          );
        }

        // Migrimi merr kopje, jo objektin origjinal.
        const migrationInput = cloneValue(workingCopy);

        const migrationOutput = await next.migrate(
          migrationInput
        );

        const normalized = normalizeMigrationResult(
          migrationOutput
        );

        // Versioni përcaktohet nga regjistrimi i migrimit,
        // jo nga rezultati i funksionit të migrimit.
        const nextDataset = {
          ...workingCopy,
          ...normalized,
          schemaVersion: next.toVersion
        };

        const validation = runValidation(
          validate,
          cloneValue(nextDataset)
        );

        if (!validation.valid) {
          throw new Error(
            validation.error ||
              `Dataset-i nuk kalon validimin pas migrimit ${next.toVersion}.`
          );
        }

        // Përditëso kopjen e punës vetëm pas validimit.
        workingCopy = cloneValue(nextDataset);
        version = next.toVersion;
        migrationsApplied += 1;
      }

      return {
        success: true,
        migrated: migrationsApplied > 0,
        dataset: workingCopy,
        metadata: {
          sourceVersion,
          targetVersion,
          finalVersion: version,
          migrationsApplied
        }
      };
    } catch (error) {
      return createFailure(
        error instanceof Error
          ? error.message
          : "Migrimi i dataset-it dështoi.",
        {
          sourceVersion,
          targetVersion,
          currentVersion: version,
          migrationsApplied,
          originalPreserved: true
        }
      );
    }
  }

  function listMigrations() {
    return Array.from(migrations.entries())
      .map(([key]) => {
        const [fromVersion, toVersion] = key.split("->");

        return {
          fromVersion,
          toVersion
        };
      })
      .sort((a, b) => {
        const comparison = compareVersions(
          a.fromVersion,
          b.fromVersion
        );

        return comparison !== 0
          ? comparison
          : compareVersions(
              a.toVersion,
              b.toVersion
            );
      });
  }

  return Object.freeze({
    currentVersion,
    registerMigration,
    migrateDataset,
    listMigrations
  });
}

export {
  compareVersions,
  validateDataset
};
