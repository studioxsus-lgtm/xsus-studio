
import { describe, it, expect, vi } from "vitest";

import {
  createDatabaseVersionControl,
  DATABASE_VERSION_CONTROL_VERSION,
  DATABASE_VERSION_CONTROL_ERRORS
} from "../../apps/app/database/database-version-control.js";

describe("Database Version Control", () => {
  function createSnapshot(tableName = "users", columns = ["id", "name"]) {
    return {
      tables: [
        {
          name: tableName,
          columns: columns.map((name) => ({
            name,
            type: name === "id" ? "integer" : "string"
          }))
        }
      ]
    };
  }

  function createVersionInput(overrides = {}) {
    return {
      id: "version-1",
      version: "1.0.0",
      schemaId: "main-schema",
      schemaSnapshot: createSnapshot(),
      migrationIds: ["migration-1"],
      changes: [],
      compatibility: {
        backwardCompatible: true,
        forwardCompatible: false,
        breakingChanges: []
      },
      metadata: {
        source: "test"
      },
      ...overrides
    };
  }

  describe("Configuration and exports", () => {
    it("exposes the correct version", () => {
      expect(DATABASE_VERSION_CONTROL_VERSION).toBe("1.0.0");
    });

    it("exposes the expected error codes", () => {
      expect(
        DATABASE_VERSION_CONTROL_ERRORS.INVALID_CONFIG
      ).toBe("INVALID_DATABASE_VERSION_CONFIG");

      expect(
        DATABASE_VERSION_CONTROL_ERRORS.VERSION_NOT_FOUND
      ).toBe("DATABASE_VERSION_NOT_FOUND");
    });

    it("creates an instance with the expected API", () => {
      const manager = createDatabaseVersionControl();

      expect(manager).toBeDefined();

      for (const method of [
        "register",
        "get",
        "list",
        "compare",
        "trackChange",
        "checkCompatibility",
        "getHistory",
        "planRestore",
        "restore",
        "getStatus",
        "close"
      ]) {
        expect(typeof manager[method]).toBe("function");
      }
    });

    it("rejects invalid configuration", () => {
      expect(() =>
        createDatabaseVersionControl({
          config: {
            maxVersions: 0
          }
        })
      ).toThrow(DATABASE_VERSION_CONTROL_ERRORS.INVALID_CONFIG);
    });

    it("rejects an invalid restore provider", () => {
      expect(() =>
        createDatabaseVersionControl({
          restoreProvider: {}
        })
      ).toThrow(DATABASE_VERSION_CONTROL_ERRORS.INVALID_CONFIG);
    });
  });

  describe("Version registration and validation", () => {
    it("registers a database version", () => {
      const manager = createDatabaseVersionControl();

      const result = manager.register(createVersionInput());

      expect(result.id).toBe("version-1");
      expect(result.version).toBe("1.0.0");
      expect(result.schemaId).toBe("main-schema");
      expect(result.schemaSnapshot.tables).toHaveLength(1);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it("rejects invalid registration input", () => {
      const manager = createDatabaseVersionControl();

      expect(() => manager.register(null)).toThrow(
        DATABASE_VERSION_CONTROL_ERRORS.INVALID_VERSION
      );
    });

    it("requires an ID", () => {
      const manager = createDatabaseVersionControl();

      expect(() =>
        manager.register({
          version: "1.0.0",
          schemaId: "main-schema"
        })
      ).toThrow(DATABASE_VERSION_CONTROL_ERRORS.INVALID_VERSION);
    });

    it("requires a version string", () => {
      const manager = createDatabaseVersionControl();

      expect(() =>
        manager.register({
          id: "version-1",
          version: "",
          schemaId: "main-schema"
        })
      ).toThrow(DATABASE_VERSION_CONTROL_ERRORS.INVALID_VERSION);
    });

    it("requires a schema ID", () => {
      const manager = createDatabaseVersionControl();

      expect(() =>
        manager.register({
          id: "version-1",
          version: "1.0.0",
          schemaId: ""
        })
      ).toThrow(DATABASE_VERSION_CONTROL_ERRORS.INVALID_VERSION);
    });

    it("rejects duplicate version IDs", () => {
      const manager = createDatabaseVersionControl();

      manager.register(createVersionInput());

      expect(() =>
        manager.register(createVersionInput())
      ).toThrow(DATABASE_VERSION_CONTROL_ERRORS.DUPLICATE_VERSION);
    });

    it("rejects duplicate version numbers for the same schema", () => {
      const manager = createDatabaseVersionControl();

      manager.register(createVersionInput());

      expect(() =>
        manager.register(
          createVersionInput({
            id: "version-2"
          })
        )
      ).toThrow(DATABASE_VERSION_CONTROL_ERRORS.DUPLICATE_VERSION);
    });

    it("allows the same version number for different schemas", () => {
      const manager = createDatabaseVersionControl();

      manager.register(createVersionInput());

      const result = manager.register(
        createVersionInput({
          id: "version-2",
          schemaId: "another-schema"
        })
      );

      expect(result.schemaId).toBe("another-schema");
    });

    it("rejects invalid schema snapshots", () => {
      const manager = createDatabaseVersionControl();

      expect(() =>
        manager.register(
          createVersionInput({
            schemaSnapshot: []
          })
        )
      ).toThrow(DATABASE_VERSION_CONTROL_ERRORS.INVALID_VERSION);
    });

    it("rejects invalid migration IDs", () => {
      const manager = createDatabaseVersionControl();

      expect(() =>
        manager.register(
          createVersionInput({
            migrationIds: ["migration-1", 123]
          })
        )
      ).toThrow(DATABASE_VERSION_CONTROL_ERRORS.INVALID_VERSION);
    });

    it("rejects invalid changes collections", () => {
      const manager = createDatabaseVersionControl();

      expect(() =>
        manager.register(
          createVersionInput({
            changes: {}
          })
        )
      ).toThrow(DATABASE_VERSION_CONTROL_ERRORS.INVALID_VERSION);
    });

    it("rejects invalid compatibility objects", () => {
      const manager = createDatabaseVersionControl();

      expect(() =>
        manager.register(
          createVersionInput({
            compatibility: []
          })
        )
      ).toThrow(DATABASE_VERSION_CONTROL_ERRORS.INVALID_VERSION);
    });

    it("enforces the maximum version count", () => {
      const manager = createDatabaseVersionControl({
        config: {
          maxVersions: 1
        }
      });

      manager.register(createVersionInput());

      expect(() =>
        manager.register(
          createVersionInput({
            id: "version-2",
            version: "2.0.0"
          })
        )
      ).toThrow(DATABASE_VERSION_CONTROL_ERRORS.INVALID_CONFIG);
    });
  });

  describe("Version retrieval and listing", () => {
    it("retrieves a registered version", () => {
      const manager = createDatabaseVersionControl();

      manager.register(createVersionInput());

      expect(manager.get("version-1").version).toBe("1.0.0");
    });

    it("throws when a version does not exist", () => {
      const manager = createDatabaseVersionControl();

      expect(() => manager.get("missing")).toThrow(
        DATABASE_VERSION_CONTROL_ERRORS.VERSION_NOT_FOUND
      );
    });

    it("lists registered versions", () => {
      const manager = createDatabaseVersionControl();

      manager.register(createVersionInput());

      manager.register(
        createVersionInput({
          id: "version-2",
          version: "2.0.0"
        })
      );

      expect(manager.list()).toHaveLength(2);
    });

    it("returns versions in chronological order", () => {
      const manager = createDatabaseVersionControl();

      manager.register(createVersionInput());

      manager.register(
        createVersionInput({
          id: "version-2",
          version: "2.0.0"
        })
      );

      const versions = manager.list();

      expect(versions[0].id).toBe("version-1");
      expect(versions[1].id).toBe("version-2");
    });
  });

  describe("Version comparison", () => {
    it("identifies identical schema snapshots", () => {
      const manager = createDatabaseVersionControl();

      manager.register(createVersionInput());

      manager.register(
        createVersionInput({
          id: "version-2",
          version: "2.0.0"
        })
      );

      const result = manager.compare("version-1", "version-2");

      expect(result.identical).toBe(true);
      expect(result.summary.total).toBe(0);
    });

    it("identifies added schema fields", () => {
      const manager = createDatabaseVersionControl();

      manager.register(createVersionInput());

      manager.register(
        createVersionInput({
          id: "version-2",
          version: "2.0.0",
          schemaSnapshot: createSnapshot("users", [
            "id",
            "name",
            "email"
          ])
        })
      );

      const result = manager.compare("version-1", "version-2");

      expect(result.identical).toBe(false);
      expect(result.summary.total).toBeGreaterThan(0);
      expect(
        result.differences.some((item) => item.type === "ADDED")
      ).toBe(true);
    });

    it("identifies removed schema fields", () => {
      const manager = createDatabaseVersionControl();

      manager.register(
        createVersionInput({
          schemaSnapshot: createSnapshot("users", [
            "id",
            "name",
            "email"
          ])
        })
      );

      manager.register(
        createVersionInput({
          id: "version-2",
          version: "2.0.0",
          schemaSnapshot: createSnapshot("users", [
            "id",
            "name"
          ])
        })
      );

      const result = manager.compare("version-1", "version-2");

      expect(
        result.differences.some((item) => item.type === "REMOVED")
      ).toBe(true);
    });

    it("rejects comparison across different schemas", () => {
      const manager = createDatabaseVersionControl();

      manager.register(createVersionInput());

      manager.register(
        createVersionInput({
          id: "version-2",
          version: "2.0.0",
          schemaId: "another-schema"
        })
      );

      expect(() =>
        manager.compare("version-1", "version-2")
      ).toThrow(
        DATABASE_VERSION_CONTROL_ERRORS.INVALID_COMPARISON
      );
    });

    it("does not mutate registered versions during comparison", () => {
      const manager = createDatabaseVersionControl();

      manager.register(createVersionInput());

      manager.register(
        createVersionInput({
          id: "version-2",
          version: "2.0.0"
        })
      );

      const before = manager.get("version-1");

      manager.compare("version-1", "version-2");

      const after = manager.get("version-1");

      expect(after).toEqual(before);
    });
  });

  describe("Change tracking", () => {
    it("tracks a change against a version", () => {
      const manager = createDatabaseVersionControl();

      manager.register(createVersionInput());

      const result = manager.trackChange({
        versionId: "version-1",
        change: {
          type: "ADD_COLUMN",
          description: "Shtohet kolona email."
        }
      });

      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe("ADD_COLUMN");
    });

    it("marks known breaking changes automatically", () => {
      const manager = createDatabaseVersionControl();

      manager.register(createVersionInput());

      const result = manager.trackChange({
        versionId: "version-1",
        change: {
          type: "DROP_TABLE",
          description: "Tabela e vjetër hiqet."
        }
      });

      expect(result.changes[0].breaking).toBe(true);
      expect(result.compatibility.breakingChanges).toContain(
        "Tabela e vjetër hiqet."
      );
    });

    it("rejects changes for an unknown version", () => {
      const manager = createDatabaseVersionControl();

      expect(() =>
        manager.trackChange({
          versionId: "missing",
          change: {
            type: "ADD_COLUMN"
          }
        })
      ).toThrow(
        DATABASE_VERSION_CONTROL_ERRORS.VERSION_NOT_FOUND
      );
    });

    it("rejects invalid change objects", () => {
      const manager = createDatabaseVersionControl();

      manager.register(createVersionInput());

      expect(() =>
        manager.trackChange({
          versionId: "version-1",
          change: null
        })
      ).toThrow(
        DATABASE_VERSION_CONTROL_ERRORS.INVALID_VERSION
      );
    });
  });

  describe("Compatibility checks", () => {
    it("reports compatible versions without breaking changes", () => {
      const manager = createDatabaseVersionControl();

      manager.register(createVersionInput());

      manager.register(
        createVersionInput({
          id: "version-2",
          version: "2.0.0"
        })
      );

      const result = manager.checkCompatibility(
        "version-1",
        "version-2"
      );

      expect(result.compatible).toBe(true);
      expect(result.breakingChanges).toHaveLength(0);
    });

    it("reports breaking changes", () => {
      const manager = createDatabaseVersionControl();

      manager.register(createVersionInput());

      manager.register(
        createVersionInput({
          id: "version-2",
          version: "2.0.0",
          changes: [
            {
              type: "DROP_COLUMN",
              description: "Kolona email hiqet."
            }
          ]
        })
      );

      const result = manager.checkCompatibility(
        "version-1",
        "version-2"
      );

      expect(result.compatible).toBe(false);
      expect(result.breakingChanges.length).toBeGreaterThan(0);
    });

    it("rejects compatibility checks for unknown versions", () => {
      const manager = createDatabaseVersionControl();

      expect(() =>
        manager.checkCompatibility("missing", "missing")
      ).toThrow(
        DATABASE_VERSION_CONTROL_ERRORS.VERSION_NOT_FOUND
      );
    });
  });

  describe("Restore planning and execution", () => {
    it("creates a restore plan when no provider is configured", () => {
      const manager = createDatabaseVersionControl();

      manager.register(createVersionInput());

      const plan = manager.planRestore("version-1");

      expect(plan.snapshotAvailable).toBe(true);
      expect(plan.providerAvailable).toBe(false);
      expect(plan.executable).toBe(false);
      expect(plan.reason).toBe("RESTORE_PROVIDER_UNAVAILABLE");
    });

    it("reports a missing snapshot", () => {
      const manager = createDatabaseVersionControl();

      manager.register(
        createVersionInput({
          schemaSnapshot: undefined
        })
      );

      const plan = manager.planRestore("version-1");

      expect(plan.snapshotAvailable).toBe(false);
      expect(plan.executable).toBe(false);
      expect(plan.reason).toBe("SCHEMA_SNAPSHOT_UNAVAILABLE");
    });

    it("rejects restore when no provider is configured", async () => {
      const manager = createDatabaseVersionControl();

      manager.register(createVersionInput());

      await expect(
        manager.restore("version-1")
      ).rejects.toThrow(
        DATABASE_VERSION_CONTROL_ERRORS.RESTORE_UNSUPPORTED
      );
    });

    it("executes restore through the injected provider", async () => {
      const restore = vi.fn().mockResolvedValue({
        restored: true
      });

      const manager = createDatabaseVersionControl({
        restoreProvider: {
          restore
        }
      });

      manager.register(createVersionInput());

      const result = await manager.restore("version-1");

      expect(restore).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(result.targetVersionId).toBe("version-1");
    });

    it("passes the schema snapshot to the provider", async () => {
      const restore = vi.fn().mockResolvedValue({
        restored: true
      });

      const manager = createDatabaseVersionControl({
        restoreProvider: {
          restore
        }
      });

      const input = createVersionInput();

      manager.register(input);

      await manager.restore("version-1");

      expect(restore).toHaveBeenCalledWith(
        expect.objectContaining({
          version: expect.objectContaining({
            id: "version-1"
          }),
          snapshot: input.schemaSnapshot
        })
      );
    });

    it("wraps provider failures with the restore error code", async () => {
      const restore = vi.fn().mockRejectedValue(
        new Error("Provider failure")
      );

      const manager = createDatabaseVersionControl({
        restoreProvider: {
          restore
        }
      });

      manager.register(createVersionInput());

      await expect(
        manager.restore("version-1")
      ).rejects.toThrow(
        DATABASE_VERSION_CONTROL_ERRORS.RESTORE_FAILED
      );
    });
  });

  describe("History and lifecycle", () => {
    it("records version registration in history", () => {
      const manager = createDatabaseVersionControl();

      manager.register(createVersionInput());

      const history = manager.getHistory();

      expect(history).toHaveLength(1);
      expect(history[0].action).toBe("VERSION_REGISTERED");
    });

    it("records tracked changes in history", () => {
      const manager = createDatabaseVersionControl();

      manager.register(createVersionInput());

      manager.trackChange({
        versionId: "version-1",
        change: {
          type: "ADD_COLUMN"
        }
      });

      expect(manager.getHistory()).toHaveLength(2);
      expect(manager.getHistory()[1].action).toBe("CHANGE_TRACKED");
    });

    it("limits the history size", () => {
      const manager = createDatabaseVersionControl({
        config: {
          maxHistory: 2
        }
      });

      manager.register(createVersionInput());

      manager.trackChange({
        versionId: "version-1",
        change: {
          type: "ADD_COLUMN"
        }
      });

      manager.trackChange({
        versionId: "version-1",
        change: {
          type: "ADD_INDEX"
        }
      });

      expect(manager.getHistory()).toHaveLength(2);
    });

    it("returns the current status", () => {
      const manager = createDatabaseVersionControl();

      manager.register(createVersionInput());

      const status = manager.getStatus();

      expect(status.version).toBe("1.0.0");
      expect(status.closed).toBe(false);
      expect(status.storage).toBe("RAM");
      expect(status.versionCount).toBe(1);
    });

    it("returns immutable records", () => {
      const manager = createDatabaseVersionControl();

      manager.register(createVersionInput());

      const result = manager.get("version-1");

      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.schemaSnapshot)).toBe(true);
    });

    it("does not expose mutable internal state", () => {
      const manager = createDatabaseVersionControl();

      manager.register(createVersionInput());

      const result = manager.get("version-1");

      expect(() => {
        result.schemaSnapshot.tables.push({
          name: "injected"
        });
      }).toThrow();

      expect(manager.get("version-1").schemaSnapshot.tables).toHaveLength(1);
    });

    it("closes the manager", () => {
      const manager = createDatabaseVersionControl();

      manager.register(createVersionInput());

      const result = manager.close();

      expect(result.success).toBe(true);
      expect(manager.getStatus().closed).toBe(true);
      expect(manager.getStatus().versionCount).toBe(0);
    });

    it("rejects operations after close", () => {
      const manager = createDatabaseVersionControl();

      manager.close();

      expect(() => manager.register(createVersionInput())).toThrow(
        DATABASE_VERSION_CONTROL_ERRORS.MANAGER_CLOSED
      );

      expect(() => manager.list()).toThrow(
        DATABASE_VERSION_CONTROL_ERRORS.MANAGER_CLOSED
      );

      expect(() => manager.getHistory()).toThrow(
        DATABASE_VERSION_CONTROL_ERRORS.MANAGER_CLOSED
      );
    });

    it("allows close to be called more than once", () => {
      const manager = createDatabaseVersionControl();

      manager.close();

      const result = manager.close();

      expect(result.success).toBe(true);
      expect(result.alreadyClosed).toBe(true);
    });
  });
});
