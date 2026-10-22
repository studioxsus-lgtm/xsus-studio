
/**
 * XSUS AI Core — Memory Health & Observability
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Kontrolli i shëndetit të memories.
 * - Verifikimi i leximit dhe shkrimit.
 * - Mbledhja e statistikave.
 * - Standardizimi i gabimeve diagnostikuese.
 *
 * Nuk ndryshon gjendjen e sesioneve ekzistuese.
 */

export const MEMORY_HEALTH_VERSION = "1.0.0";

const HEALTH_STATUS = Object.freeze({
  HEALTHY: "healthy",
  DEGRADED: "degraded",
  UNHEALTHY: "unhealthy"
});

function createError(code, message) {
  return { code, message };
}

function getErrorMessage(error) {
  return error instanceof Error
    ? error.message
    : String(error ?? "Gabim i panjohur.");
}

/**
 * Krijon shërbimin e diagnostikimit të memories.
 *
 * storage duhet të ofrojë:
 * - get(key)
 * - set(key, value)
 * - delete(key)
 *
 * getStats() është opsional.
 */
export function createMemoryHealth({ storage } = {}) {
  if (
    !storage ||
    typeof storage.get !== "function" ||
    typeof storage.set !== "function" ||
    typeof storage.delete !== "function"
  ) {
    throw new TypeError(
      "MemoryHealth kërkon storage me metodat get, set dhe delete."
    );
  }

  async function checkMemoryHealth() {
    const checkedAt = new Date().toISOString();
    const checks = {
      storageAvailable: false,
      write: false,
      read: false,
      delete: false,
      statistics: false
    };

    const errors = [];
    let stats = null;

    // Kontrollon disponueshmërinë bazë të storage.
    checks.storageAvailable = true;

    // Përdor një çelës të përkohshëm unik për testin.
    const probeKey =
      `__xsus_health_probe__:${Date.now()}:` +
      Math.random().toString(36).slice(2);

    const probeValue = {
      type: "health-check",
      version: MEMORY_HEALTH_VERSION,
      token: probeKey
    };

    let probeCreated = false;

    try {
      await storage.set(probeKey, probeValue);
      probeCreated = true;
      checks.write = true;
    } catch (error) {
      errors.push(
        createError("MEMORY_WRITE_FAILED", getErrorMessage(error))
      );
    }

    if (probeCreated) {
      try {
        const result = await storage.get(probeKey);

        if (
          result &&
          result.type === probeValue.type &&
          result.version === probeValue.version &&
          result.token === probeValue.token
        ) {
          checks.read = true;
        } else {
          errors.push(
            createError(
              "MEMORY_READ_INTEGRITY_FAILED",
              "Të dhënat e lexuara nuk përputhen me të dhënat e shkruara."
            )
          );
        }
      } catch (error) {
        errors.push(
          createError("MEMORY_READ_FAILED", getErrorMessage(error))
        );
      }

      try {
        await storage.delete(probeKey);
        probeCreated = false;
        checks.delete = true;
      } catch (error) {
        errors.push(
          createError("MEMORY_DELETE_FAILED", getErrorMessage(error))
        );
      }
    }

    // Statistikat janë opsionale dhe nuk duhet të bllokojnë
    // diagnostikimin bazë të storage.
    if (typeof storage.getStats === "function") {
      try {
        stats = await storage.getStats();
        checks.statistics = true;
      } catch (error) {
        errors.push(
          createError("MEMORY_STATS_FAILED", getErrorMessage(error))
        );
      }
    } else {
      checks.statistics = null;
    }

    // Përpiqet të pastrojë provën nëse fshirja fillestare dështoi.
    if (probeCreated) {
      try {
        await storage.delete(probeKey);
      } catch {
        // Gabimi i fshirjes është raportuar më sipër.
      }
    }

    const coreChecksPassed =
      checks.storageAvailable &&
      checks.write &&
      checks.read &&
      checks.delete;

    let status = HEALTH_STATUS.HEALTHY;

    if (!coreChecksPassed) {
      status = HEALTH_STATUS.UNHEALTHY;
    } else if (errors.length > 0) {
      status = HEALTH_STATUS.DEGRADED;
    }

    return {
      version: MEMORY_HEALTH_VERSION,
      status,
      checkedAt,
      checks,
      stats,
      errors
    };
  }

  return Object.freeze({
    checkMemoryHealth
  });
}

export { HEALTH_STATUS };
