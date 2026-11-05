
import { describe, it, expect, vi } from "vitest";

import {
  APP_DATABASE_DESIGNER_VERSION,
  APP_DATABASE_CAPABILITIES,
  APP_DATABASE_ENGINES,
  createDatabaseDesigner
} from "../../apps/app/database/database-designer.js";

function createValidSchema() {
  return {
    tables: [
      {
        name: "users",
        columns: [
          { name: "id", type: "integer" },
          { name: "email", type: "varchar" }
        ]
      }
    ]
  };
}

function createProvider(overrides = {}) {
  return {
    design: vi.fn(async () => ({
      schema: createValidSchema(),
      indexes: [{ table: "users", columns: ["email"] }],
      migrations: [{ version: "001", name: "create_users" }],
      ...overrides
    }))
  };
}

describe("XSUS App Database Designer", () => {
  describe("exports and initialization", () => {
    it("exposes the expected version", () => {
      expect(APP_DATABASE_DESIGNER_VERSION).toBe("1.0.0");
    });

    it("exposes database capabilities", () => {
      expect(APP_DATABASE_CAPABILITIES).toEqual(
        expect.arrayContaining([
          "database-architecture",
          "schema-design",
          "table-design",
          "relationship-design",
          "index-planning",
          "migration-generation"
        ])
      );
    });

    it("exposes supported database engines", () => {
      expect(APP_DATABASE_ENGINES).toEqual(
        expect.arrayContaining([
          "postgresql",
          "mysql",
          "sqlite",
          "mongodb",
          "mariadb",
          "sql-server"
        ])
      );
    });

    it("freezes exported configuration arrays", () => {
      expect(Object.isFrozen(APP_DATABASE_CAPABILITIES)).toBe(true);
      expect(Object.isFrozen(APP_DATABASE_ENGINES)).toBe(true);
    });

    it("creates a designer instance", () => {
      const designer = createDatabaseDesigner();

      expect(designer.name).toBe("XSUS App Database Designer");
      expect(designer.version).toBe("1.0.0");
      expect(typeof designer.design).toBe("function");
      expect(Object.isFrozen(designer)).toBe(true);
    });
  });

  describe("configuration validation", () => {
    it("uses the default PostgreSQL engine", async () => {
      const provider = createProvider();
      const designer = createDatabaseDesigner({ provider });

      const result = await designer.design({
        prompt: "Create a user database"
      });

      expect(result.success).toBe(true);
      expect(result.data.engine).toBe("postgresql");
    });

    it("uses a custom valid default engine", async () => {
      const provider = createProvider();
      const designer = createDatabaseDesigner({
        config: { defaultEngine: "mysql" },
        provider
      });

      const result = await designer.design({
        prompt: "Create a user database"
      });

      expect(result.success).toBe(true);
      expect(result.data.engine).toBe("mysql");
    });

    it("rejects an invalid maxPromptLength", async () => {
      const designer = createDatabaseDesigner({
        config: { maxPromptLength: 0 }
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_CONFIG");
    });

    it("rejects an invalid maxTables", async () => {
      const designer = createDatabaseDesigner({
        config: { maxTables: -1 }
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_CONFIG");
    });

    it("rejects an unsupported default engine", async () => {
      const designer = createDatabaseDesigner({
        config: { defaultEngine: "oracle" }
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_CONFIG");
    });
  });

  describe("request validation", () => {
    it("rejects a null request", async () => {
      const designer = createDatabaseDesigner({
        provider: createProvider()
      });

      const result = await designer.design(null);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_REQUEST");
    });

    it("rejects an array request", async () => {
      const designer = createDatabaseDesigner({
        provider: createProvider()
      });

      const result = await designer.design([]);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_REQUEST");
    });

    it("rejects an empty prompt", async () => {
      const designer = createDatabaseDesigner({
        provider: createProvider()
      });

      const result = await designer.design({ prompt: "   " });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_REQUEST");
    });

    it("rejects a prompt exceeding the configured limit", async () => {
      const designer = createDatabaseDesigner({
        config: { maxPromptLength: 5 },
        provider: createProvider()
      });

      const result = await designer.design({
        prompt: "123456"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("PROMPT_TOO_LONG");
    });

    it("rejects an unsupported database engine", async () => {
      const designer = createDatabaseDesigner({
        provider: createProvider()
      });

      const result = await designer.design({
        prompt: "Create database",
        engine: "oracle"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("UNSUPPORTED_DATABASE");
    });

    it("normalizes the requested engine", async () => {
      const provider = createProvider();
      const designer = createDatabaseDesigner({ provider });

      const result = await designer.design({
        prompt: "Create database",
        engine: "MYSQL"
      });

      expect(result.success).toBe(true);
      expect(result.data.engine).toBe("mysql");
    });

    it("trims the prompt and project type", async () => {
      const provider = createProvider();
      const designer = createDatabaseDesigner({ provider });

      await designer.design({
        prompt: "  Create database  ",
        projectType: "  ecommerce  "
      });

      expect(provider.design).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: "Create database",
          projectType: "ecommerce"
        })
      );
    });

    it("normalizes requirements", async () => {
      const provider = createProvider();
      const designer = createDatabaseDesigner({ provider });

      await designer.design({
        prompt: "Create database",
        requirements: [
          " authentication ",
          "",
          123,
          " reporting "
        ]
      });

      expect(provider.design).toHaveBeenCalledWith(
        expect.objectContaining({
          requirements: ["authentication", "reporting"]
        })
      );
    });

    it("supports disabling indexes and migrations", async () => {
      const provider = createProvider();
      const designer = createDatabaseDesigner({ provider });

      await designer.design({
        prompt: "Create database",
        includeIndexes: false,
        includeMigrations: false
      });

      expect(provider.design).toHaveBeenCalledWith(
        expect.objectContaining({
          includeIndexes: false,
          includeMigrations: false
        })
      );
    });
  });

  describe("provider handling", () => {
    it("returns an error when the provider is unavailable", async () => {
      const designer = createDatabaseDesigner();

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("DATABASE_PROVIDER_UNAVAILABLE");
    });

    it("calls the provider with normalized input", async () => {
      const provider = createProvider();
      const designer = createDatabaseDesigner({ provider });

      await designer.design({
        prompt: " Create database ",
        engine: "MYSQL"
      });

      expect(provider.design).toHaveBeenCalledTimes(1);
      expect(provider.design).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: "Create database",
          engine: "mysql"
        })
      );
    });

    it("rejects an invalid provider response", async () => {
      const provider = {
        design: vi.fn(async () => null)
      };

      const designer = createDatabaseDesigner({ provider });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_PROVIDER_RESPONSE");
    });

    it("handles provider exceptions", async () => {
      const provider = {
        design: vi.fn(async () => {
          throw new Error("Provider failure");
        })
      };

      const designer = createDatabaseDesigner({ provider });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("DATABASE_DESIGN_FAILED");
    });
  });

  describe("schema validation", () => {
    it("accepts a valid schema", async () => {
      const designer = createDatabaseDesigner({
        provider: createProvider()
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.success).toBe(true);
      expect(result.data.schema.tables).toHaveLength(1);
    });

    it("rejects a non-object schema", async () => {
      const designer = createDatabaseDesigner({
        provider: createProvider({ schema: null })
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_SCHEMA");
    });

    it("rejects a schema without a tables array", async () => {
      const designer = createDatabaseDesigner({
        provider: createProvider({
          schema: { name: "invalid" }
        })
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_TABLES");
    });

    it("rejects a schema exceeding the table limit", async () => {
      const designer = createDatabaseDesigner({
        config: { maxTables: 1 },
        provider: createProvider({
          schema: {
            tables: [
              { name: "users", columns: [] },
              { name: "orders", columns: [] }
            ]
          })
        })
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("TABLE_LIMIT_EXCEEDED");
    });

    it("rejects an invalid table", async () => {
      const designer = createDatabaseDesigner({
        provider: createProvider({
          schema: { tables: [{ name: "", columns: [] }] }
        })
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_TABLE");
    });

    it("rejects duplicate table names case-insensitively", async () => {
      const designer = createDatabaseDesigner({
        provider: createProvider({
          schema: {
            tables: [
              { name: "users", columns: [] },
              { name: "USERS", columns: [] }
            ]
          }
        })
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("DUPLICATE_TABLE");
    });

    it("rejects invalid columns", async () => {
      const designer = createDatabaseDesigner({
        provider: createProvider({
          schema: {
            tables: [
              {
                name: "users",
                columns: [{ name: "id", type: "" }]
              }
            ]
          }
        })
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_COLUMN");
    });

    it("rejects duplicate column names case-insensitively", async () => {
      const designer = createDatabaseDesigner({
        provider: createProvider({
          schema: {
            tables: [
              {
                name: "users",
                columns: [
                  { name: "email", type: "varchar" },
                  { name: "EMAIL", type: "text" }
                ]
              }
            ]
          }
        })
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("DUPLICATE_COLUMN");
    });
  });

  describe("indexes and migrations", () => {
    it("returns provider indexes", async () => {
      const designer = createDatabaseDesigner({
        provider: createProvider()
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.success).toBe(true);
      expect(result.data.indexes).toEqual([
        { table: "users", columns: ["email"] }
      ]);
    });

    it("returns provider migrations", async () => {
      const designer = createDatabaseDesigner({
        provider: createProvider()
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.success).toBe(true);
      expect(result.data.migrations).toEqual([
        { version: "001", name: "create_users" }
      ]);
    });

    it("uses empty arrays when indexes are omitted", async () => {
      const designer = createDatabaseDesigner({
        provider: createProvider({ indexes: undefined })
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.success).toBe(true);
      expect(result.data.indexes).toEqual([]);
    });

    it("uses empty arrays when migrations are omitted", async () => {
      const designer = createDatabaseDesigner({
        provider: createProvider({ migrations: undefined })
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.success).toBe(true);
      expect(result.data.migrations).toEqual([]);
    });

    it("rejects invalid indexes", async () => {
      const designer = createDatabaseDesigner({
        provider: createProvider({ indexes: {} })
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_PROVIDER_RESPONSE");
    });

    it("rejects invalid migrations", async () => {
      const designer = createDatabaseDesigner({
        provider: createProvider({ migrations: "invalid" })
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_PROVIDER_RESPONSE");
    });
  });

  describe("metadata and immutability", () => {
    it("returns correct metadata", async () => {
      const designer = createDatabaseDesigner({
        provider: createProvider()
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.success).toBe(true);
      expect(result.metadata).toEqual({
        designerVersion: "1.0.0",
        tableCount: 1
      });
    });

    it("freezes the result and nested schema", async () => {
      const designer = createDatabaseDesigner({
        provider: createProvider()
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.data)).toBe(true);
      expect(Object.isFrozen(result.data.schema)).toBe(true);
      expect(Object.isFrozen(result.data.schema.tables)).toBe(true);
      expect(Object.isFrozen(result.data.schema.tables[0])).toBe(true);
      expect(Object.isFrozen(result.data.schema.tables[0].columns)).toBe(true);
      expect(Object.isFrozen(result.data.schema.tables[0].columns[0])).toBe(true);
      expect(Object.isFrozen(result.data.indexes)).toBe(true);
      expect(Object.isFrozen(result.data.migrations)).toBe(true);
      expect(Object.isFrozen(result.metadata)).toBe(true);
    });

    it("does not mutate the provider schema", async () => {
      const schema = createValidSchema();
      const provider = createProvider({ schema });
      const designer = createDatabaseDesigner({ provider });

      await designer.design({
        prompt: "Create database"
      });

      expect(Object.isFrozen(schema)).toBe(false);
      expect(Object.isFrozen(schema.tables)).toBe(false);
      expect(Object.isFrozen(schema.tables[0])).toBe(false);
    });
  });
});
