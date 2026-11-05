
import { describe, it, expect, vi } from "vitest";

import {
  createAppEngine,
  XSUS_APP_ENGINE_VERSION,
  APP_ENGINE_CAPABILITIES
} from "../../apps/app/engine/app-engine.js";

function createMockMigrationManager() {
  return {
    register: vi.fn(input => ({
      success: true,
      migration: input
    })),

    get: vi.fn(id => ({
      success: true,
      id
    })),

    list: vi.fn(() => ({
      success: true,
      migrations: []
    })),

    plan: vi.fn(version => ({
      success: true,
      targetVersion: version,
      migrations: []
    })),

    migrate: vi.fn(version => ({
      success: true,
      targetVersion: version,
      executed: []
    })),

    rollback: vi.fn(version => ({
      success: true,
      targetVersion: version,
      rolledBack: []
    })),

    getHistory: vi.fn(() => ({
      success: true,
      history: []
    })),

    getStatus: vi.fn(() => ({
      status: "active"
    })),

    close: vi.fn()
  };
}

function createTestEngine(migrationManager) {
  return createAppEngine({
    architect: vi.fn(async () => ({
      success: true,
      architecture: {
        type: "modular"
      }
    })),

    migrationManager
  });
}

async function processMigration(
  engine,
  migrationAction,
  extra = {}
) {
  return engine.processRequest({
    prompt: "Test database migration",
    modules: {
      migrationManagement: true
    },
    migrationAction,
    ...extra
  });
}

describe("XSUS App — Migration Manager Integration", () => {
  describe("Engine integration", () => {
    it("preserves the App Engine version", () => {
      expect(XSUS_APP_ENGINE_VERSION).toBe("1.5.0");
    });

    it("registers the migration management capability", () => {
      expect(
        APP_ENGINE_CAPABILITIES
      ).toContain("database-migration-management");
    });

    it("accepts an injected migration manager", () => {
      const manager = createMockMigrationManager();
      const engine = createTestEngine(manager);

      expect(engine.version).toBe("1.5.0");
      expect(engine.getStatus().migrationManager).toEqual({
        status: "active"
      });

      engine.close();
    });
  });

  describe("Migration registration", () => {
    it("delegates migration registration", async () => {
      const manager = createMockMigrationManager();
      const engine = createTestEngine(manager);

      const migration = {
        id: "migration-001",
        fromVersion: 1,
        toVersion: 2,
        description: "Create users table"
      };

      const result = await processMigration(
        engine,
        "register",
        {
          migrationInput: migration
        }
      );

      expect(manager.register).toHaveBeenCalledWith(migration);

      expect(
        result.data.modules.migrationManagement
      ).toEqual({
        success: true,
        migration
      });

      expect(result.success).toBe(true);

      engine.close();
    });
  });

  describe("Migration retrieval", () => {
    it("delegates migration retrieval", async () => {
      const manager = createMockMigrationManager();
      const engine = createTestEngine(manager);

      const result = await processMigration(
        engine,
        "get",
        {
          migrationId: "migration-001"
        }
      );

      expect(manager.get).toHaveBeenCalledWith(
        "migration-001"
      );

      expect(
        result.data.modules.migrationManagement.success
      ).toBe(true);

      engine.close();
    });

    it("delegates migration listing", async () => {
      const manager = createMockMigrationManager();
      const engine = createTestEngine(manager);

      const result = await processMigration(
        engine,
        "list"
      );

      expect(manager.list).toHaveBeenCalledOnce();

      expect(
        result.data.modules.migrationManagement
      ).toEqual({
        success: true,
        migrations: []
      });

      engine.close();
    });
  });

  describe("Migration planning and execution", () => {
    it("delegates migration planning", async () => {
      const manager = createMockMigrationManager();
      const engine = createTestEngine(manager);

      const result = await processMigration(
        engine,
        "plan",
        {
          migrationTargetVersion: 3
        }
      );

      expect(manager.plan).toHaveBeenCalledWith(3);

      expect(
        result.data.modules.migrationManagement.targetVersion
      ).toBe(3);

      engine.close();
    });

    it("delegates migration execution", async () => {
      const manager = createMockMigrationManager();
      const engine = createTestEngine(manager);

      const result = await processMigration(
        engine,
        "migrate",
        {
          migrationTargetVersion: 3
        }
      );

      expect(manager.migrate).toHaveBeenCalledWith(3);

      expect(
        result.data.modules.migrationManagement.success
      ).toBe(true);

      engine.close();
    });

    it("rejects a missing migration target", async () => {
      const manager = createMockMigrationManager();
      const engine = createTestEngine(manager);

      const result = await processMigration(
        engine,
        "migrate"
      );

      expect(manager.migrate).not.toHaveBeenCalled();

      expect(
        result.data.modules.migrationManagement.error.code
      ).toBe("INVALID_MIGRATION_TARGET");

      expect(result.success).toBe(false);

      engine.close();
    });
  });

  describe("Migration rollback", () => {
    it("delegates rollback", async () => {
      const manager = createMockMigrationManager();
      const engine = createTestEngine(manager);

      const result = await processMigration(
        engine,
        "rollback",
        {
          migrationTargetVersion: 1
        }
      );

      expect(manager.rollback).toHaveBeenCalledWith(1);

      expect(
        result.data.modules.migrationManagement.success
      ).toBe(true);

      engine.close();
    });

    it("rejects rollback without a target version", async () => {
      const manager = createMockMigrationManager();
      const engine = createTestEngine(manager);

      const result = await processMigration(
        engine,
        "rollback"
      );

      expect(manager.rollback).not.toHaveBeenCalled();

      expect(
        result.data.modules.migrationManagement.error.code
      ).toBe("INVALID_MIGRATION_TARGET");

      engine.close();
    });
  });

  describe("Migration history and status", () => {
    it("delegates history retrieval", async () => {
      const manager = createMockMigrationManager();
      const engine = createTestEngine(manager);

      const result = await processMigration(
        engine,
        "history"
      );

      expect(manager.getHistory).toHaveBeenCalledOnce();

      expect(
        result.data.modules.migrationManagement
      ).toEqual({
        success: true,
        history: []
      });

      engine.close();
    });

    it("delegates migration status", async () => {
      const manager = createMockMigrationManager();
      const engine = createTestEngine(manager);

      const result = await processMigration(
        engine,
        "status"
      );

      expect(manager.getStatus).toHaveBeenCalledOnce();

      expect(
        result.data.modules.migrationManagement
      ).toEqual({
        status: "active"
      });

      engine.close();
    });
  });

  describe("Error handling", () => {
    it("rejects an unsupported migration action", async () => {
      const manager = createMockMigrationManager();
      const engine = createTestEngine(manager);

      const result = await processMigration(
        engine,
        "invalid-action"
      );

      expect(
        result.data.modules.migrationManagement.error.code
      ).toBe("INVALID_MIGRATION_ACTION");

      engine.close();
    });

    it("reports unavailable migration manager", async () => {
      const engine = createAppEngine({
        architect: async () => ({
          success: true,
          architecture: {
            type: "modular"
          }
        })
      });

      const result = await processMigration(
        engine,
        "list"
      );

      expect(
        result.data.modules.migrationManagement.error.code
      ).toBe("MIGRATION_MANAGER_UNAVAILABLE");

      expect(result.success).toBe(false);

      engine.close();
    });

    it("reports migration manager execution failures", async () => {
      const manager = createMockMigrationManager();

      manager.migrate.mockImplementation(() => {
        throw new Error("Migration failed");
      });

      const engine = createTestEngine(manager);

      const result = await processMigration(
        engine,
        "migrate",
        {
          migrationTargetVersion: 2
        }
      );

      expect(result.success).toBe(false);

      expect(result.error.code).toBe(
        "MODULE_EXECUTION_FAILED"
      );

      expect(
        result.metadata.failedModules
      ).toContain("migrationManagement");

      engine.close();
    });
  });

  describe("Lifecycle", () => {
    it("closes the migration manager with the App Engine", () => {
      const manager = createMockMigrationManager();
      const engine = createTestEngine(manager);

      engine.close();

      expect(manager.close).toHaveBeenCalledOnce();

      expect(engine.getStatus().status).toBe("closed");
    });

    it("does not close the migration manager twice", () => {
      const manager = createMockMigrationManager();
      const engine = createTestEngine(manager);

      engine.close();
      engine.close();

      expect(manager.close).toHaveBeenCalledOnce();
    });

    it("does not process requests after closing", async () => {
      const manager = createMockMigrationManager();
      const engine = createTestEngine(manager);

      engine.close();

      const result = await processMigration(
        engine,
        "list"
      );

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("ENGINE_CLOSED");

      expect(manager.list).not.toHaveBeenCalled();
    });
  });
});
