
import { describe, it, expect, vi } from "vitest";

import {
  APP_DATABASE_DESIGNER_VERSION,
  APP_DATABASE_CAPABILITIES,
  APP_DATABASE_ENGINES,
  createDatabaseDesigner
} from "../../apps/app/database/database-designer.js";

// --------------------------------------------------
// Test helpers
// --------------------------------------------------

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
      indexes: [
        { table: "users", columns: ["email"] }
      ],
      migrations: [
        { version: "001", name: "create_users" }
      ],
      ...overrides
    }))
  };
}

async function runDesign(options = {}, request = {}) {
  const designer = createDatabaseDesigner(options);

  return designer.design({
    prompt: "Create database",
    ...request
  });
}

// --------------------------------------------------
// Main test suite
// --------------------------------------------------

describe("XSUS App Database Designer", () => {

  // ------------------------------------------------
  // 1. Exports and initialization
  // ------------------------------------------------

  describe("exports and initialization", () => {

    it("exposes the correct version", () => {
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

    it("freezes exported arrays", () => {
      expect(Object.isFrozen(APP_DATABASE_CAPABILITIES)).toBe(true);
      expect(Object.isFrozen(APP_DATABASE_ENGINES)).toBe(true);
    });

    it("creates a valid designer instance", () => {
      const designer = createDatabaseDesigner();

      expect(designer.name).toBe("XSUS App Database Designer");
      expect(designer.version).toBe("1.0.0");
      expect(typeof designer.design).toBe("function");
      expect(Object.isFrozen(designer)).toBe(true);
    });

  });

  // ------------------------------------------------
  // 2. Configuration validation
  // ------------------------------------------------

  describe("configuration validation", () => {

    it("uses PostgreSQL as the default engine", async () => {
      const result = await runDesign({
        provider: createProvider()
      });

      expect(result.success).toBe(true);
      expect(result.data.engine).toBe("postgresql");
    });

    it("supports a custom default engine", async () => {
      const result = await runDesign({
        config: { defaultEngine: "mysql" },
        provider: createProvider()
      });

      expect(result.success).toBe(true);
      expect(result.data.engine).toBe("mysql");
    });

    it("rejects invalid maxPromptLength", async () => {
      const result = await runDesign({
        config: { maxPromptLength: 0 }
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_CONFIG");
    });

    it("rejects invalid maxTables", async () => {
      const result = await runDesign({
        config: { maxTables: -1 }
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_CONFIG");
    });

    it("rejects an unsupported default engine", async () => {
      const result = await runDesign({
        config: { defaultEngine: "oracle" }
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_CONFIG");
    });

  });

  // ------------------------------------------------
  // 3. Request validation
  // ------------------------------------------------

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
      const result = await runDesign({
        provider: createProvider()
      }, {
        prompt: "   "
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_REQUEST");
    });

    it("rejects a prompt exceeding the configured limit", async () => {
      const result = await runDesign({
        config: { maxPromptLength: 5 },
        provider: createProvider()
      }, {
        prompt: "123456"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("PROMPT_TOO_LONG");
    });

    it("rejects unsupported database engines", async () => {
      const result = await runDesign({
        provider: createProvider()
      }, {
        engine: "oracle"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("UNSUPPORTED_DATABASE");
    });

    it("normalizes database engine names", async () => {
      const result = await runDesign({
        provider: createProvider()
      }, {
        engine: "MYSQL"
      });

      expect(result.success).toBe(true);
      expect(result.data.engine).toBe("mysql");
    });

    it("trims prompt and project type", async () => {
      const provider = createProvider();

      await runDesign({ provider }, {
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

      await runDesign({ provider }, {
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

      await runDesign({ provider }, {
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

  // ------------------------------------------------
  // 4. Provider handling
  // ------------------------------------------------

  describe("provider handling", () => {

    it("reports an unavailable provider", async () => {
      const result = await runDesign();

      expect(result.success).toBe(false);
      expect(result.error.code).toBe(
        "DATABASE_PROVIDER_UNAVAILABLE"
      );
    });

    it("calls the provider with normalized input", async () => {
      const provider = createProvider();

      await runDesign({ provider }, {
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

      const result = await runDesign({ provider });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe(
        "INVALID_PROVIDER_RESPONSE"
      );
    });

    it("handles provider exceptions", async () => {
      const provider = {
        design: vi.fn(async () => {
          throw new Error("Provider failure");
        })
      };

      const result = await runDesign({ provider });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe(
        "DATABASE_DESIGN_FAILED"
      );
    });

  });

  // ------------------------------------------------
  // 5. Schema validation
  // ------------------------------------------------

  describe("schema validation", () => {

    it("accepts a valid schema", async () => {
      const result = await runDesign({
        provider: createProvider()
      });

      expect(result.success).toBe(true);
      expect(result.data.schema.tables).toHaveLength(1);
    });

    it("rejects a non-object schema", async () => {
      const result = await runDesign({
        provider: createProvider({
          schema: null
        })
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_SCHEMA");
    });

    it("rejects a schema without tables", async () => {
      const result = await runDesign({
        provider: createProvider({
          schema: { name: "invalid" }
        })
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_TABLES");
    });

    it("rejects schemas exceeding the table limit", async () => {
      const result = await runDesign({
        config: { maxTables: 1 },
        provider: createProvider({
          schema: {
            tables: [
              { name: "users", columns: [] },
              { name: "orders", columns: [] }
            ]
          }
        })
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("TABLE_LIMIT_EXCEEDED");
    });

    it("rejects invalid tables", async () => {
      const result = await runDesign({
        provider: createProvider({
          schema: {
            tables: [
              { name: "", columns: [] }
            ]
          }
        })
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_TABLE");
    });

    it("rejects duplicate table names", async () => {
      const result = await runDesign({
        provider: createProvider({
          schema: {
            tables: [
              { name: "users", columns: [] },
              { name: "USERS", columns: [] }
            ]
          }
        })
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("DUPLICATE_TABLE");
    });

    it("rejects invalid columns", async () => {
      const result = await runDesign({
        provider: createProvider({
          schema: {
            tables: [
              {
                name: "users",
                columns: [
                  { name: "id", type: "" }
                ]
              }
            ]
          }
        })
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_COLUMN");
    });

    it("rejects duplicate column names", async () => {
      const result = await runDesign({
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

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("DUPLICATE_COLUMN");
    });

  });

  // ------------------------------------------------
  // 6. Indexes and migrations
  // ------------------------------------------------

  describe("indexes and migrations", () => {

    it("returns provider indexes", async () => {
      const result = await runDesign({
        provider: createProvider()
      });

      expect(result.success).toBe(true);
      expect(result.data.indexes).toEqual([
        { table: "users", columns: ["email"] }
      ]);
    });

    it("returns provider migrations", async () => {
      const result = await runDesign({
        provider: createProvider()
      });

      expect(result.success).toBe(true);
      expect(result.data.migrations).toEqual([
        { version: "001", name: "create_users" }
      ]);
    });

    it("uses empty indexes when omitted", async () => {
      const result = await runDesign({
        provider: createProvider({
          indexes: undefined
        })
      });

      expect(result.success).toBe(true);
      expect(result.data.indexes).toEqual([]);
    });

    it("uses empty migrations when omitted", async () => {
      const result = await runDesign({
        provider: createProvider({
          migrations: undefined
        })
      });

      expect(result.success).toBe(true);
      expect(result.data.migrations).toEqual([]);
    });

    it("rejects invalid indexes", async () => {
      const result = await runDesign({
        provider: createProvider({
          indexes: {}
        })
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe(
        "INVALID_PROVIDER_RESPONSE"
      );
    });

    it("rejects invalid migrations", async () => {
      const result = await runDesign({
        provider: createProvider({
          migrations: "invalid"
        })
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe(
        "INVALID_PROVIDER_RESPONSE"
      );
    });

  });

  // ------------------------------------------------
  // 7. Metadata and immutability
  // ------------------------------------------------

  describe("metadata and immutability", () => {

    it("returns correct metadata", async () => {
      const result = await runDesign({
        provider: createProvider()
      });

      expect(result.success).toBe(true);

      expect(result.metadata).toEqual({
        designerVersion: "1.0.0",
        tableCount: 1
      });
    });

    it("freezes the result and nested schema", async () => {
      const result = await runDesign({
        provider: createProvider()
      });

      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.data)).toBe(true);
      expect(Object.isFrozen(result.data.schema)).toBe(true);
      expect(Object.isFrozen(result.data.schema.tables)).toBe(true);

      expect(
        Object.isFrozen(result.data.schema.tables[0])
      ).toBe(true);

      expect(
        Object.isFrozen(result.data.schema.tables[0].columns)
      ).toBe(true);

      expect(
        Object.isFrozen(
          result.data.schema.tables[0].columns[0]
        )
      ).toBe(true);

      expect(Object.isFrozen(result.data.indexes)).toBe(true);
      expect(Object.isFrozen(result.data.migrations)).toBe(true);
      expect(Object.isFrozen(result.metadata)).toBe(true);
    });

    it("does not mutate the provider schema", async () => {
      const schema = createValidSchema();
      const provider = createProvider({ schema });

      await runDesign({ provider });

      expect(Object.isFrozen(schema)).toBe(false);
      expect(Object.isFrozen(schema.tables)).toBe(false);
      expect(Object.isFrozen(schema.tables[0])).toBe(false);
    });

  });

});
