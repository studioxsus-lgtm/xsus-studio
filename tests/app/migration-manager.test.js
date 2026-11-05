
import { describe, it, expect, vi } from "vitest";

import {
  createMigrationManager,
  MIGRATION_MANAGER_VERSION,
  MIGRATION_MANAGER_ERRORS,
} from "../../apps/app/database/migration-manager.js";

/**
 * Kontrollon kodin e gabimit, jo tekstin e mesazhit.
 */
function toThrowErrorCode(callback, expectedCode) {
  let thrownError;

  try {
    callback();
  } catch (error) {
    thrownError = error;
  }

  expect(thrownError).toBeInstanceOf(Error);
  expect(thrownError.code).toBe(expectedCode);
}

/**
 * Kontrollon kodin e gabimit për operacione asinkrone.
 */
async function toRejectWithErrorCode(promise, expectedCode) {
  let rejectedError;

  try {
    await promise;
  } catch (error) {
    rejectedError = error;
  }

  expect(rejectedError).toBeInstanceOf(Error);
  expect(rejectedError.code).toBe(expectedCode);
}

describe("Migration Manager", () => {
  const createMigration = (overrides = {}) => ({
    id: "migration-1",
    fromVersion: 0,
    toVersion: 1,
    description: "Initial migration",
    metadata: {},
    ...overrides,
  });

  describe("exports and configuration", () => {
    it("exports the expected version", () => {
      expect(MIGRATION_MANAGER_VERSION).toBe("1.0.0");
    });

    it("creates a manager with default configuration", () => {
      const manager = createMigrationManager();

      expect(manager.getStatus()).toMatchObject({
        version: "1.0.0",
        currentVersion: 0,
        registeredMigrations: 0,
        historyEntries: 0,
        operationInProgress: false,
        providerAvailable: false,
        rollbackSupported: false,
        closed: false,
      });
    });

    it("accepts a custom initial version", () => {
      const manager = createMigrationManager({
        config: { initialVersion: 3 },
      });

      expect(manager.getStatus().currentVersion).toBe(3);
    });

    it("rejects invalid configuration", () => {
      toThrowErrorCode(
        () =>
          createMigrationManager({
            config: { maxMigrations: 0 },
          }),
        MIGRATION_MANAGER_ERRORS.INVALID_CONFIG
      );
    });

    it("rejects invalid options", () => {
      expect(() => createMigrationManager(null)).toThrow();
    });

    it("rejects an invalid provider", () => {
      toThrowErrorCode(
        () =>
          createMigrationManager({
            provider: {},
          }),
        MIGRATION_MANAGER_ERRORS.INVALID_PROVIDER
      );
    });
  });

  describe("migration registration", () => {
    it("registers a valid migration", () => {
      const manager = createMigrationManager();

      const migration = manager.register(createMigration());

      expect(migration).toMatchObject({
        id: "migration-1",
        fromVersion: 0,
        toVersion: 1,
      });

      expect(manager.getStatus().registeredMigrations).toBe(1);
    });

    it("trims migration identifiers", () => {
      const manager = createMigrationManager();

      const migration = manager.register(
        createMigration({ id: " migration-1 " })
      );

      expect(migration.id).toBe("migration-1");
    });

    it("rejects a missing identifier", () => {
      const manager = createMigrationManager();

      toThrowErrorCode(
        () => manager.register(createMigration({ id: " " })),
        MIGRATION_MANAGER_ERRORS.INVALID_MIGRATION
      );
    });

    it("rejects invalid migration objects", () => {
      const manager = createMigrationManager();

      toThrowErrorCode(
        () => manager.register(null),
        MIGRATION_MANAGER_ERRORS.INVALID_MIGRATION
      );
    });

    it("rejects negative versions", () => {
      const manager = createMigrationManager();

      expect(() =>
        manager.register(createMigration({ fromVersion: -1 }))
      ).toThrow();
    });

    it("rejects non-integer versions", () => {
      const manager = createMigrationManager();

      toThrowErrorCode(
        () =>
          manager.register(
            createMigration({ toVersion: 1.5 })
          ),
        MIGRATION_MANAGER_ERRORS.INVALID_MIGRATION_VERSION
      );
    });

    it("rejects a target version not greater than the source", () => {
      const manager = createMigrationManager();

      toThrowErrorCode(
        () =>
          manager.register(
            createMigration({
              fromVersion: 2,
              toVersion: 2,
            })
          ),
        MIGRATION_MANAGER_ERRORS.INVALID_MIGRATION_VERSION
      );
    });

    it("rejects duplicate migration identifiers", () => {
      const manager = createMigrationManager();

      manager.register(createMigration());

      toThrowErrorCode(
        () => manager.register(createMigration()),
        MIGRATION_MANAGER_ERRORS.DUPLICATE_MIGRATION
      );
    });

    it("rejects conflicting version transitions", () => {
      const manager = createMigrationManager();

      manager.register(createMigration());

      toThrowErrorCode(
        () =>
          manager.register(
            createMigration({
              id: "migration-2",
              fromVersion: 0,
              toVersion: 2,
            })
          ),
        MIGRATION_MANAGER_ERRORS.INVALID_MIGRATION
      );
    });

    it("rejects invalid metadata", () => {
      const manager = createMigrationManager();

      toThrowErrorCode(
        () =>
          manager.register(
            createMigration({ metadata: [] })
          ),
        MIGRATION_MANAGER_ERRORS.INVALID_MIGRATION
      );
    });

    it("returns immutable migration records", () => {
      const manager = createMigrationManager();

      const migration = manager.register(
        createMigration({
          metadata: { owner: "XSUS" },
        })
      );

      expect(Object.isFrozen(migration)).toBe(true);
      expect(Object.isFrozen(migration.metadata)).toBe(true);
    });

    it("returns null for an unknown migration", () => {
      const manager = createMigrationManager();

      expect(manager.get("unknown")).toBeNull();
    });

    it("lists migrations in version order", () => {
      const manager = createMigrationManager();

      manager.register(
        createMigration({
          id: "migration-2",
          fromVersion: 1,
          toVersion: 2,
        })
      );

      manager.register(createMigration());

      expect(manager.list().map((item) => item.id)).toEqual([
        "migration-1",
        "migration-2",
      ]);
    });
  });

  describe("migration planning", () => {
    it("creates a valid migration plan", () => {
      const manager = createMigrationManager();

      manager.register(createMigration());

      manager.register(
        createMigration({
          id: "migration-2",
          fromVersion: 1,
          toVersion: 2,
        })
      );

      const result = manager.plan(2);

      expect(result.fromVersion).toBe(0);
      expect(result.targetVersion).toBe(2);
      expect(result.migrations.map((item) => item.id)).toEqual([
        "migration-1",
        "migration-2",
      ]);
    });

    it("rejects a target below current version", () => {
      const manager = createMigrationManager({
        config: { initialVersion: 2 },
      });

      toThrowErrorCode(
        () => manager.plan(1),
        MIGRATION_MANAGER_ERRORS.INVALID_VERSION
      );
    });

    it("rejects an incomplete migration path", () => {
      const manager = createMigrationManager();

      manager.register(
        createMigration({
          fromVersion: 0,
          toVersion: 2,
        })
      );

      toThrowErrorCode(
        () => manager.plan(3),
        MIGRATION_MANAGER_ERRORS.INVALID_VERSION
      );
    });

    it("returns an empty plan for the current version", () => {
      const manager = createMigrationManager();

      expect(manager.plan(0).migrations).toEqual([]);
    });
  });

  describe("migration execution", () => {
    it("executes migrations in order", async () => {
      const apply = vi.fn().mockResolvedValue(undefined);

      const manager = createMigrationManager({
        provider: { apply },
      });

      manager.register(createMigration());

      manager.register(
        createMigration({
          id: "migration-2",
          fromVersion: 1,
          toVersion: 2,
        })
      );

      const result = await manager.migrate(2);

      expect(result.success).toBe(true);
      expect(result.fromVersion).toBe(0);
      expect(result.currentVersion).toBe(2);
      expect(result.executed).toEqual([
        "migration-1",
        "migration-2",
      ]);

      expect(apply).toHaveBeenCalledTimes(2);
      expect(manager.getStatus().currentVersion).toBe(2);
    });

    it("rejects execution without a provider", async () => {
      const manager = createMigrationManager();

      manager.register(createMigration());

      await toRejectWithErrorCode(
        manager.migrate(1),
        MIGRATION_MANAGER_ERRORS.PROVIDER_UNAVAILABLE
      );
    });

    it("records successful migrations in history", async () => {
      const manager = createMigrationManager({
        provider: {
          apply: vi.fn().mockResolvedValue(undefined),
        },
      });

      manager.register(createMigration());

      await manager.migrate(1);

      expect(manager.getHistory()).toHaveLength(1);
      expect(manager.getHistory()[0]).toMatchObject({
        migrationId: "migration-1",
        action: "apply",
        status: "success",
        fromVersion: 0,
        toVersion: 1,
      });
    });

    it("records a failed migration and preserves the last successful version", async () => {
      const manager = createMigrationManager({
        provider: {
          apply: vi.fn()
            .mockResolvedValueOnce(undefined)
            .mockRejectedValueOnce(new Error("Database failure")),
        },
      });

      manager.register(createMigration());

      manager.register(
        createMigration({
          id: "migration-2",
          fromVersion: 1,
          toVersion: 2,
        })
      );

      await toRejectWithErrorCode(
        manager.migrate(2),
        MIGRATION_MANAGER_ERRORS.MIGRATION_FAILED
      );

      expect(manager.getStatus().currentVersion).toBe(1);

      expect(manager.getHistory().map((item) => item.status)).toEqual([
        "success",
        "failed",
      ]);
    });

    it("does not execute migrations when already at target version", async () => {
      const apply = vi.fn();

      const manager = createMigrationManager({
        provider: { apply },
      });

      const result = await manager.migrate(0);

      expect(result.success).toBe(true);
      expect(result.executed).toEqual([]);
      expect(apply).not.toHaveBeenCalled();
    });

    it("resets operation state after provider failure", async () => {
      const manager = createMigrationManager({
        provider: {
          apply: vi.fn().mockRejectedValue(new Error("Failure")),
        },
      });

      manager.register(createMigration());

      await expect(manager.migrate(1)).rejects.toThrow();

      expect(manager.getStatus().operationInProgress).toBe(false);
    });
  });

  describe("rollback", () => {
    it("rolls back an applied migration", async () => {
      const apply = vi.fn().mockResolvedValue(undefined);
      const rollback = vi.fn().mockResolvedValue(undefined);

      const manager = createMigrationManager({
        provider: { apply, rollback },
      });

      manager.register(createMigration());

      await manager.migrate(1);

      const result = await manager.rollback(0);

      expect(result.success).toBe(true);
      expect(result.currentVersion).toBe(0);
      expect(result.rolledBack).toEqual(["migration-1"]);
      expect(rollback).toHaveBeenCalledTimes(1);
    });

    it("rejects rollback when unsupported", async () => {
      const manager = createMigrationManager({
        provider: {
          apply: vi.fn().mockResolvedValue(undefined),
        },
      });

      manager.register(createMigration());

      await manager.migrate(1);

      await toRejectWithErrorCode(
        manager.rollback(0),
        MIGRATION_MANAGER_ERRORS.ROLLBACK_UNSUPPORTED
      );
    });

    it("rejects rollback to the current or a higher version", async () => {
      const manager = createMigrationManager({
        provider: {
          apply: vi.fn().mockResolvedValue(undefined),
          rollback: vi.fn(),
        },
      });

      manager.register(createMigration());

      await manager.migrate(1);

      await toRejectWithErrorCode(
        manager.rollback(1),
        MIGRATION_MANAGER_ERRORS.INVALID_VERSION
      );
    });

    it("records rollback history", async () => {
      const manager = createMigrationManager({
        provider: {
          apply: vi.fn().mockResolvedValue(undefined),
          rollback: vi.fn().mockResolvedValue(undefined),
        },
      });

      manager.register(createMigration());

      await manager.migrate(1);
      await manager.rollback(0);

      expect(manager.getHistory().map((item) => item.action)).toEqual([
        "apply",
        "rollback",
      ]);
    });

    it("resets operation state after rollback failure", async () => {
      const manager = createMigrationManager({
        provider: {
          apply: vi.fn().mockResolvedValue(undefined),
          rollback: vi.fn().mockRejectedValue(new Error("Rollback failure")),
        },
      });

      manager.register(createMigration());

      await manager.migrate(1);

      await toRejectWithErrorCode(
        manager.rollback(0),
        MIGRATION_MANAGER_ERRORS.ROLLBACK_FAILED
      );

      expect(manager.getStatus().operationInProgress).toBe(false);
      expect(manager.getStatus().currentVersion).toBe(1);
    });
  });

  describe("history and lifecycle", () => {
    it("returns a copy of history", async () => {
      const manager = createMigrationManager({
        provider: {
          apply: vi.fn().mockResolvedValue(undefined),
        },
      });

      manager.register(createMigration());

      await manager.migrate(1);

      const history = manager.getHistory();

      history.pop();

      expect(manager.getHistory()).toHaveLength(1);
    });

    it("enforces the history size limit", async () => {
      const manager = createMigrationManager({
        config: { maxHistoryEntries: 1 },
        provider: {
          apply: vi.fn().mockResolvedValue(undefined),
        },
      });

      manager.register(createMigration());

      manager.register(
        createMigration({
          id: "migration-2",
          fromVersion: 1,
          toVersion: 2,
        })
      );

      await manager.migrate(2);

      expect(manager.getHistory()).toHaveLength(1);
      expect(manager.getHistory()[0].migrationId).toBe("migration-2");
    });

    it("closes the manager", () => {
      const manager = createMigrationManager();

      manager.register(createMigration());
      manager.close();

      expect(manager.getStatus().closed).toBe(true);
      expect(manager.getStatus().registeredMigrations).toBe(0);
    });

    it("allows close to be called more than once", () => {
      const manager = createMigrationManager();

      expect(() => {
        manager.close();
        manager.close();
      }).not.toThrow();
    });

    it("rejects operations after close", () => {
      const manager = createMigrationManager();

      manager.close();

      toThrowErrorCode(
        () => manager.list(),
        MIGRATION_MANAGER_ERRORS.MANAGER_CLOSED
      );
    });

    it("does not close during an active migration", async () => {
      let release;

      const pending = new Promise((resolve) => {
        release = resolve;
      });

      const manager = createMigrationManager({
        provider: {
          apply: () => pending,
        },
      });

      manager.register(createMigration());

      const migrationPromise = manager.migrate(1);

      await Promise.resolve();

      toThrowErrorCode(
        () => manager.close(),
        MIGRATION_MANAGER_ERRORS.OPERATION_IN_PROGRESS
      );

      release();

      await migrationPromise;
    });
  });
});
