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
          { name: "id", type: "integer", primaryKey: true },
          { name: "email", type: "varchar", nullable: false }
        ]
      },
      {
        name: "posts",
        columns: [
          { name: "id", type: "integer", primaryKey: true },
          { name: "user_id", type: "integer" }
        ]
      }
    ]
  };
}

function createProvider(overrides = {}) {
  return {
    design: vi.fn().mockResolvedValue({
      schema: createValidSchema(),
      indexes: [{ table: "users", columns: ["email"] }],
      migrations: [{ name: "create_users" }],
      ...overrides
    })
  };
}

describe("XSUS App Database Designer", () => {
  describe("version and capabilities", () => {
    it("exposes the correct version", () => {
      expect(APP_DATABASE_DESIGNER_VERSION).toBe("1.0.0");
    });

    it("exposes supported capabilities", () => {
      expect(APP_DATABASE_CAPABILITIES).toEqual([
        "database-architecture",
        "schema-design",
        "table-design",
        "relationship-design",
        "index-planning",
        "migration-generation"
      ]);
    });

    it("freezes public capability and engine arrays", () => {
      expect(Object.isFrozen(APP_DATABASE_CAPABILITIES)).toBe(true);
      expect(Object.isFrozen(APP_DATABASE_ENGINES)).toBe(true);
    });

    it("exposes supported database engines", () => {
      expect(APP_DATABASE_ENGINES).toContain("postgresql");
      expect(APP_DATABASE_ENGINES).toContain("mysql");
      expect(APP_DATABASE_ENGINES).toContain("sqlite");
      expect(APP_DATABASE_ENGINES).toContain("mongodb");
      expect(APP_DATABASE_ENGINES).toContain("mariadb");
      expect(APP_DATABASE_ENGINES).toContain("sql-server");
    });
  });

  describe("designer initialization", () => {
    it("creates a designer instance", () => {
      const designer = createDatabaseDesigner();

      expect(designer.name).toBe("XSUS App Database Designer");
      expect(designer.version).toBe("1.0.0");
      expect(typeof designer.design).toBe("function");
    });

    it("freezes the designer instance", () => {
      const designer = createDatabaseDesigner();

      expect(Object.isFrozen(designer)).toBe(true);
    });

    it("uses default configuration", async () => {
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
        provider,
        config: { defaultEngine: "mysql" }
      });

      const result = await designer.design({
        prompt: "Create a database"
      });

      expect(result.success).toBe(true);
      expect(result.data.engine).toBe("mysql");
    });
  });

  describe("configuration validation", () => {
    it("rejects an invalid maximum prompt length", async () => {
      const designer = createDatabaseDesigner({
        config: { maxPromptLength: 0 }
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_CONFIG");
    });

    it("rejects a non-integer maximum prompt length", async () => {
      const designer = createDatabaseDesigner({
        config: { maxPromptLength: 10.5 }
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.error.code).toBe("INVALID_CONFIG");
    });

    it("rejects an invalid maximum table count", async () => {
      const designer = createDatabaseDesigner({
        config: { maxTables: 0 }
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.error.code).toBe("INVALID_CONFIG");
    });

    it("rejects an unsupported default engine", async () => {
      const designer = createDatabaseDesigner({
        config: { defaultEngine: "unknown-db" }
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.error.code).toBe("INVALID_CONFIG");
    });

    it("accepts valid custom limits", async () => {
      const provider = createProvider();
      const designer = createDatabaseDesigner({
        provider,
        config: {
          maxPromptLength: 100,
          maxTables: 10
        }
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.success).toBe(true);
    });
  });

  describe("request validation", () => {
    it("rejects a missing request", async () => {
      const designer = createDatabaseDesigner();

      const result = await designer.design();

      expect(result.success).toBe(false);
      expect(result.error.code).toBe("INVALID_REQUEST");
    });

    it("rejects null requests", async () => {
      const designer = createDatabaseDesigner();

      const result = await designer.design(null);

      expect(result.error.code).toBe("INVALID_REQUEST");
    });

    it("rejects array requests", async () => {
      const designer = createDatabaseDesigner();

      const result = await designer.design([]);

      expect(result.error.code).toBe("INVALID_REQUEST");
    });

    it("rejects empty prompts", async () => {
      const designer = createDatabaseDesigner();

      const result = await designer.design({
        prompt: "   "
      });

      expect(result.error.code).toBe("INVALID_REQUEST");
    });

    it("rejects non-string prompts", async () => {
      const designer = createDatabaseDesigner();

      const result = await designer.design({
        prompt: 123
      });

      expect(result.error.code).toBe("INVALID_REQUEST");
    });

    it("rejects prompts exceeding the configured limit", async () => {
      const designer = createDatabaseDesigner({
        config: { maxPromptLength: 5 }
      });

      const result = await designer.design({
        prompt: "Create a database"
      });

      expect(result.error.code).toBe("PROMPT_TOO_LONG");
    });

    it("rejects unsupported database engines", async () => {
      const designer = createDatabaseDesigner();

      const result = await designer.design({
        prompt: "Create database",
        engine: "unsupported"
      });

      expect(result.error.code).toBe("UNSUPPORTED_DATABASE");
    });

    it("normalizes the database engine", async () => {
      const provider = createProvider();
      const designer = createDatabaseDesigner({ provider });

      const result = await designer.design({
        prompt: "Create database",
        engine: "MYSQL"
      });

      expect(result.success).toBe(true);
      expect(provider.design).toHaveBeenCalledWith(
        expect.objectContaining({ engine: "mysql" })
      );
    });

    it("trims the prompt before calling the provider", async () => {
      const provider = createProvider();
      const designer = createDatabaseDesigner({ provider });

      await designer.design({
        prompt: "  Create database  "
      });

      expect(provider.design).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: "Create database"
        })
      );
    });

    it("uses the default project type", async () => {
      const provider = createProvider();
      const designer = createDatabaseDesigner({ provider });

      await designer.design({
        prompt: "Create database"
      });

      expect(provider.design).toHaveBeenCalledWith(
        expect.objectContaining({
          projectType: "application"
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

    it("uses default index and migration options", async () => {
      const provider = createProvider();
      const designer = createDatabaseDesigner({ provider });

      await designer.design({
        prompt: "Create database"
      });

      expect(provider.design).toHaveBeenCalledWith(
        expect.objectContaining({
          includeIndexes: true,
          includeMigrations: true
        })
      );
    });

    it("respects disabled indexes and migrations", async () => {
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
    it("returns an error when no provider is configured", async () => {
      const designer = createDatabaseDesigner();

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.error.code).toBe(
        "DATABASE_PROVIDER_UNAVAILABLE"
      );
    });

    it("returns an error when provider.design is missing", async () => {
      const designer = createDatabaseDesigner({
        provider: {}
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.error.code).toBe(
        "DATABASE_PROVIDER_UNAVAILABLE"
      );
    });

    it("rejects a null provider response", async () => {
      const provider = {
        design: vi.fn().mockResolvedValue(null)
      };

      const designer = createDatabaseDesigner({ provider });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.error.code).toBe(
        "INVALID_PROVIDER_RESPONSE"
      );
    });

    it("rejects an array provider response", async () => {
      const provider = {
        design: vi.fn().mockResolvedValue([])
      };

      const designer = createDatabaseDesigner({ provider });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.error.code).toBe(
        "INVALID_PROVIDER_RESPONSE"
      );
    });

    it("handles provider exceptions", async () => {
      const provider = {
        design: vi.fn().mockRejectedValue(
          new Error("Provider failure")
        )
      };

      const designer = createDatabaseDesigner({ provider });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe(
        "DATABASE_DESIGN_FAILED"
      );
    });
  });

  describe("schema validation", () => {
    it("accepts a valid database schema", async () => {
      const designer = createDatabaseDesigner({
        provider: createProvider()
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.success).toBe(true);
      expect(result.data.schema.tables).toHaveLength(2);
    });

    it("rejects a missing schema", async () => {
      const designer = createDatabaseDesigner({
        provider: {
          design: vi.fn().mockResolvedValue({})
        }
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.error.code).toBe("INVALID_SCHEMA");
    });

    it("rejects an array schema", async () => {
      const designer = createDatabaseDesigner({
        provider: {
          design: vi.fn().mockResolvedValue({
            schema: []
          })
        }
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.error.code).toBe("INVALID_SCHEMA");
    });

    it("rejects missing tables", async () => {
      const designer = createDatabaseDesigner({
        provider: {
          design: vi.fn().mockResolvedValue({
            schema: {}
          })
        }
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.error.code).toBe("INVALID_TABLES");
    });

    it("rejects invalid tables collections", async () => {
      const designer = createDatabaseDesigner({
        provider: {
          design: vi.fn().mockResolvedValue({
            schema: { tables: {} }
          })
        }
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.error.code).toBe("INVALID_TABLES");
    });

    it("enforces the maximum table count", async () => {
      const designer = createDatabaseDesigner({
        provider: {
          design: vi.fn().mockResolvedValue({
            schema: {
              tables: [
                { name: "users", columns: [] },
                { name: "posts", columns: [] }
              ]
            }
          })
        },
        config: { maxTables: 1 }
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.error.code).toBe("TABLE_LIMIT_EXCEEDED");
    });

    it("rejects tables without names", async () => {
      const designer = createDatabaseDesigner({
        provider: {
          design: vi.fn().mockResolvedValue({
            schema: {
              tables: [{ columns: [] }]
            }
          })
        }
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.error.code).toBe("INVALID_TABLE");
    });

    it("rejects tables without columns arrays", async () => {
      const designer = createDatabaseDesigner({
        provider: {
          design: vi.fn().mockResolvedValue({
            schema: {
              tables: [{ name: "users" }]
            }
          })
        }
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.error.code).toBe("INVALID_TABLE");
    });

    it("rejects duplicate table names case-insensitively", async () => {
      const designer = createDatabaseDesigner({
        provider: {
          design: vi.fn().mockResolvedValue({
            schema: {
              tables: [
                { name: "Users", columns: [] },
                { name: "users", columns: [] }
              ]
            }
          })
        }
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.error.code).toBe("DUPLICATE_TABLE");
    });

    it("rejects invalid columns", async () => {
      const designer = createDatabaseDesigner({
        provider: {
          design: vi.fn().mockResolvedValue({
            schema: {
              tables: [
                {
                  name: "users",
                  columns: [{ name: "id" }]
                }
              ]
            }
          })
        }
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.error.code).toBe("INVALID_COLUMN");
    });

    it("rejects duplicate column names case-insensitively", async () => {
      const designer = createDatabaseDesigner({
        provider: {
          design: vi.fn().mockResolvedValue({
            schema: {
              tables: [
                {
                  name: "users",
                  columns: [
                    { name: "id", type: "integer" },
                    { name: "ID", type: "integer" }
                  ]
                }
              ]
            }
          })
        }
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.error.code).toBe("DUPLICATE_COLUMN");
    });

    it("allows tables with empty columns arrays", async () => {
      const designer = createDatabaseDesigner({
        provider: {
          design: vi.fn().mockResolvedValue({
            schema: {
              tables: [{ name: "users", columns: [] }]
            }
          })
        }
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.success).toBe(true);
    });
  });

  describe("indexes and migrations", () => {
    it("returns provider indexes", async () => {
      const designer = createDatabaseDesigner({
        provider: createProvider({
          indexes: [{ name: "users_email_idx" }]
        })
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.success).toBe(true);
      expect(result.data.indexes).toEqual([
        { name: "users_email_idx" }
      ]);
    });

    it("returns provider migrations", async () => {
      const designer = createDatabaseDesigner({
        provider: createProvider({
          migrations: [{ name: "initial_migration" }]
        })
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.data.migrations).toEqual([
        { name: "initial_migration" }
      ]);
    });

    it("uses empty arrays when indexes are omitted", async () => {
      const designer = createDatabaseDesigner({
        provider: {
          design: vi.fn().mockResolvedValue({
            schema: createValidSchema()
          })
        }
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.data.indexes).toEqual([]);
    });

    it("uses empty arrays when migrations are omitted", async () => {
      const designer = createDatabaseDesigner({
        provider: {
          design: vi.fn().mockResolvedValue({
            schema: createValidSchema()
          })
        }
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.data.migrations).toEqual([]);
    });

    it("rejects non-array indexes", async () => {
      const designer = createDatabaseDesigner({
        provider: createProvider({
          indexes: { name: "invalid" }
        })
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.error.code).toBe(
        "INVALID_PROVIDER_RESPONSE"
      );
    });

    it("rejects non-array migrations", async () => {
      const designer = createDatabaseDesigner({
        provider: createProvider({
          migrations: "invalid"
        })
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.error.code).toBe(
        "INVALID_PROVIDER_RESPONSE"
      );
    });
  });

  describe("immutability and metadata", () => {
    it("freezes the returned response", async () => {
      const designer = createDatabaseDesigner({
        provider: createProvider()
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.data)).toBe(true);
      expect(Object.isFrozen(result.metadata)).toBe(true);
    });

    it("freezes schema tables and columns recursively", async () => {
      const designer = createDatabaseDesigner({
        provider: createProvider()
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(Object.isFrozen(result.data.schema)).toBe(true);
      expect(Object.isFrozen(result.data.schema.tables)).toBe(true);
      expect(Object.isFrozen(result.data.schema.tables[0])).toBe(true);
      expect(
        Object.isFrozen(result.data.schema.tables[0].columns)
      ).toBe(true);
      expect(
        Object.isFrozen(result.data.schema.tables[0].columns[0])
      ).toBe(true);
    });

    it("does not freeze the provider's original schema", async () => {
      const schema = createValidSchema();

      const designer = createDatabaseDesigner({
        provider: {
          design: vi.fn().mockResolvedValue({
            schema
          })
        }
      });

      await designer.design({
        prompt: "Create database"
      });

      expect(Object.isFrozen(schema)).toBe(false);
      expect(Object.isFrozen(schema.tables)).toBe(false);
      expect(Object.isFrozen(schema.tables[0])).toBe(false);
    });

    it("does not modify the original schema", async () => {
      const schema = createValidSchema();
      const originalName = schema.tables[0].name;

      const designer = createDatabaseDesigner({
        provider: {
          design: vi.fn().mockResolvedValue({ schema })
        }
      });

      await designer.design({
        prompt: "Create database"
      });

      expect(schema.tables[0].name).toBe(originalName);
    });

    it("freezes indexes and migrations recursively", async () => {
      const designer = createDatabaseDesigner({
        provider: createProvider({
          indexes: [{ columns: ["email"] }],
          migrations: [{ operations: [{ type: "create" }] }]
        })
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(Object.isFrozen(result.data.indexes)).toBe(true);
      expect(Object.isFrozen(result.data.indexes[0])).toBe(true);
      expect(
        Object.isFrozen(result.data.indexes[0].columns)
      ).toBe(true);

      expect(Object.isFrozen(result.data.migrations)).toBe(true);
      expect(Object.isFrozen(result.data.migrations[0])).toBe(true);
      expect(
        Object.isFrozen(result.data.migrations[0].operations)
      ).toBe(true);
    });

    it("reports the correct metadata", async () => {
      const designer = createDatabaseDesigner({
        provider: createProvider()
      });

      const result = await designer.design({
        prompt: "Create database"
      });

      expect(result.metadata).toEqual({
        designerVersion: "1.0.0",
        tableCount: 2
      });
    });

    it("reports the selected database engine", async () => {
      const designer = createDatabaseDesigner({
        provider: createProvider()
      });

      const result = await designer.design({
        prompt: "Create database",
        engine: "sqlite"
      });

      expect(result.data.engine).toBe("sqlite");
    });
  });
});
