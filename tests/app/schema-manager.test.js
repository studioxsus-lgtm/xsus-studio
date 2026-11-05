
import { describe, it, expect } from "vitest";

import {
  createSchemaManager,
  APP_SCHEMA_MANAGER_VERSION,
  APP_SCHEMA_MANAGER_CAPABILITIES
} from "../../apps/app/database/schema-manager.js";

function createValidSchema(overrides = {}) {
  return {
    id: "users-schema",
    engine: "postgresql",
    schema: {
      tables: [
        {
          name: "users",
          columns: [
            { name: "id", type: "integer" },
            { name: "email", type: "varchar" }
          ]
        }
      ]
    },
    ...overrides
  };
}

describe("XSUS App Schema Manager", () => {
  describe("Exports and initialization", () => {
    it("exposes the expected version", () => {
      expect(APP_SCHEMA_MANAGER_VERSION).toBe("1.0.0");
    });

    it("exposes its capabilities", () => {
      expect(APP_SCHEMA_MANAGER_CAPABILITIES).toContain(
        "schema-registration"
      );
      expect(APP_SCHEMA_MANAGER_CAPABILITIES).toContain(
        "schema-versioning"
      );
    });

    it("creates an active manager", () => {
      const manager = createSchemaManager();

      expect(manager.name).toBe("XSUS App Schema Manager");
      expect(manager.version).toBe("1.0.0");
      expect(manager.getStatus().status).toBe("active");
    });

    it("exposes all public methods", () => {
      const manager = createSchemaManager();

      expect(typeof manager.register).toBe("function");
      expect(typeof manager.get).toBe("function");
      expect(typeof manager.update).toBe("function");
      expect(typeof manager.list).toBe("function");
      expect(typeof manager.remove).toBe("function");
      expect(typeof manager.getStatus).toBe("function");
      expect(typeof manager.close).toBe("function");
    });
  });

  describe("Configuration validation", () => {
    it("rejects a non-positive maxSchemas value", () => {
      const manager = createSchemaManager({
        config: { maxSchemas: 0 }
      });

      const result = manager.register(createValidSchema());

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_CONFIG");
    });

    it("rejects a non-integer maxSchemas value", () => {
      const manager = createSchemaManager({
        config: { maxSchemas: 1.5 }
      });

      const result = manager.register(createValidSchema());

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_CONFIG");
    });

    it("supports a custom schema limit", () => {
      const manager = createSchemaManager({
        config: { maxSchemas: 1 }
      });

      expect(manager.register(createValidSchema()).success).toBe(true);

      const result = manager.register(
        createValidSchema({ id: "products-schema" })
      );

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("SCHEMA_LIMIT_EXCEEDED");
    });

    it("uses the default schema limit", () => {
      const manager = createSchemaManager();

      expect(manager.getStatus().maxSchemas).toBe(1000);
    });
  });

  describe("Schema registration", () => {
    it("registers a valid schema", () => {
      const manager = createSchemaManager();

      const result = manager.register(createValidSchema());

      expect(result.success).toBe(true);
      expect(result.data.id).toBe("users-schema");
      expect(result.data.engine).toBe("postgresql");
      expect(result.data.version).toBe(1);
    });

    it("sets creation and update timestamps", () => {
      const manager = createSchemaManager();

      const result = manager.register(createValidSchema());

      expect(typeof result.data.createdAt).toBe("string");
      expect(typeof result.data.updatedAt).toBe("string");
      expect(Number.isNaN(Date.parse(result.data.createdAt))).toBe(false);
      expect(Number.isNaN(Date.parse(result.data.updatedAt))).toBe(false);
    });

    it("rejects a non-object registration request", () => {
      const manager = createSchemaManager();

      const result = manager.register(null);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_SCHEMA");
    });

    it("rejects an empty schema ID", () => {
      const manager = createSchemaManager();

      const result = manager.register(
        createValidSchema({ id: " " })
      );

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_SCHEMA");
    });

    it("rejects a missing engine", () => {
      const manager = createSchemaManager();
      const input = createValidSchema();
      delete input.engine;

      const result = manager.register(input);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_SCHEMA");
    });

    it("rejects an invalid schema object", () => {
      const manager = createSchemaManager();

      const result = manager.register(
        createValidSchema({ schema: null })
      );

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_SCHEMA");
    });

    it("rejects a schema without a tables array", () => {
      const manager = createSchemaManager();

      const result = manager.register(
        createValidSchema({ schema: {} })
      );

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_SCHEMA");
    });

    it("rejects duplicate schema IDs", () => {
      const manager = createSchemaManager();

      manager.register(createValidSchema());

      const result = manager.register(createValidSchema());

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("SCHEMA_ALREADY_EXISTS");
    });

    it("does not mutate the supplied schema", () => {
      const manager = createSchemaManager();
      const input = createValidSchema();

      manager.register(input);

      expect(Object.isFrozen(input)).toBe(false);
      expect(Object.isFrozen(input.schema)).toBe(false);
    });

    it("stores an immutable schema record", () => {
      const manager = createSchemaManager();

      const result = manager.register(createValidSchema());

      expect(Object.isFrozen(result.data)).toBe(true);
      expect(Object.isFrozen(result.data.schema)).toBe(true);
      expect(Object.isFrozen(result.data.schema.tables)).toBe(true);
      expect(Object.isFrozen(result.data.schema.tables[0])).toBe(true);
    });
  });

  describe("Schema retrieval", () => {
    it("retrieves a registered schema", () => {
      const manager = createSchemaManager();

      manager.register(createValidSchema());

      const result = manager.get("users-schema");

      expect(result.success).toBe(true);
      expect(result.data.id).toBe("users-schema");
    });

    it("rejects an invalid schema ID", () => {
      const manager = createSchemaManager();

      const result = manager.get(" ");

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_SCHEMA_ID");
    });

    it("returns an error for an unknown schema", () => {
      const manager = createSchemaManager();

      const result = manager.get("unknown-schema");

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("SCHEMA_NOT_FOUND");
    });
  });

  describe("Schema updates and versioning", () => {
    it("updates an existing schema", () => {
      const manager = createSchemaManager();

      manager.register(createValidSchema());

      const result = manager.update("users-schema", {
        engine: "mysql",
        schema: {
          tables: [
            {
              name: "users",
              columns: [
                { name: "id", type: "integer" }
              ]
            }
          ]
        }
      });

      expect(result.success).toBe(true);
      expect(result.data.engine).toBe("mysql");
      expect(result.data.version).toBe(2);
    });

    it("increments the version after every update", () => {
      const manager = createSchemaManager();

      manager.register(createValidSchema());

      const first = manager.update("users-schema", {
        engine: "postgresql",
        schema: { tables: [] }
      });

      const second = manager.update("users-schema", {
        engine: "mysql",
        schema: { tables: [] }
      });

      expect(first.data.version).toBe(2);
      expect(second.data.version).toBe(3);
    });

    it("preserves the original creation timestamp", () => {
      const manager = createSchemaManager();

      const registered = manager.register(createValidSchema());

      const updated = manager.update("users-schema", {
        engine: "mysql",
        schema: { tables: [] }
      });

      expect(updated.data.createdAt).toBe(
        registered.data.createdAt
      );
    });

    it("rejects updates for unknown schemas", () => {
      const manager = createSchemaManager();

      const result = manager.update("unknown-schema", {
        engine: "mysql",
        schema: { tables: [] }
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("SCHEMA_NOT_FOUND");
    });

    it("rejects invalid replacement schemas", () => {
      const manager = createSchemaManager();

      manager.register(createValidSchema());

      const result = manager.update("users-schema", {
        engine: "mysql",
        schema: {}
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_SCHEMA");
    });

    it("does not modify the existing schema after an invalid update", () => {
      const manager = createSchemaManager();

      manager.register(createValidSchema());

      manager.update("users-schema", {
        engine: "mysql",
        schema: {}
      });

      const result = manager.get("users-schema");

      expect(result.success).toBe(true);
      expect(result.data.engine).toBe("postgresql");
      expect(result.data.version).toBe(1);
    });
  });

  describe("Schema listing", () => {
    it("lists all registered schemas", () => {
      const manager = createSchemaManager();

      manager.register(createValidSchema());

      manager.register(
        createValidSchema({ id: "products-schema" })
      );

      const result = manager.list();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.metadata.count).toBe(2);
    });

    it("returns an empty list when no schemas exist", () => {
      const manager = createSchemaManager();

      const result = manager.list();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.metadata.count).toBe(0);
    });

    it("returns an immutable list", () => {
      const manager = createSchemaManager();

      manager.register(createValidSchema());

      const result = manager.list();

      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.data)).toBe(true);
    });
  });

  describe("Schema removal", () => {
    it("removes an existing schema", () => {
      const manager = createSchemaManager();

      manager.register(createValidSchema());

      const result = manager.remove("users-schema");

      expect(result.success).toBe(true);
      expect(result.data.removed).toBe(true);
      expect(manager.getStatus().schemaCount).toBe(0);
    });

    it("rejects removal with an invalid ID", () => {
      const manager = createSchemaManager();

      const result = manager.remove("");

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_SCHEMA_ID");
    });

    it("rejects removal of an unknown schema", () => {
      const manager = createSchemaManager();

      const result = manager.remove("unknown-schema");

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("SCHEMA_NOT_FOUND");
    });
  });

  describe("Lifecycle management", () => {
    it("closes the manager", () => {
      const manager = createSchemaManager();

      manager.close();

      expect(manager.getStatus().status).toBe("closed");
    });

    it("clears registered schemas when closed", () => {
      const manager = createSchemaManager();

      manager.register(createValidSchema());
      manager.close();

      expect(manager.getStatus().schemaCount).toBe(0);
    });

    it("does not fail when closed more than once", () => {
      const manager = createSchemaManager();

      expect(() => {
        manager.close();
        manager.close();
      }).not.toThrow();
    });

    it("rejects registration after closing", () => {
      const manager = createSchemaManager();

      manager.close();

      const result = manager.register(createValidSchema());

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("SCHEMA_MANAGER_CLOSED");
    });

    it("rejects retrieval after closing", () => {
      const manager = createSchemaManager();

      manager.close();

      const result = manager.get("users-schema");

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("SCHEMA_MANAGER_CLOSED");
    });

    it("rejects updates after closing", () => {
      const manager = createSchemaManager();

      manager.close();

      const result = manager.update("users-schema", {
        engine: "mysql",
        schema: { tables: [] }
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("SCHEMA_MANAGER_CLOSED");
    });

    it("rejects listing after closing", () => {
      const manager = createSchemaManager();

      manager.close();

      const result = manager.list();

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("SCHEMA_MANAGER_CLOSED");
    });

    it("rejects removal after closing", () => {
      const manager = createSchemaManager();

      manager.close();

      const result = manager.remove("users-schema");

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("SCHEMA_MANAGER_CLOSED");
    });
  });
});
