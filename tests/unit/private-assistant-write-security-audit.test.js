import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
const sql = readFileSync(new URL("../../supabase/verification/xsus_private_assistant_write_security_audit.sql", import.meta.url), "utf8");
const statements = sql.split("\n").filter(line => !line.trim().startsWith("--")).join("\n");
describe("Private assistant write security audit SQL", () => {
  it("is read-only", () => {
    expect(statements).not.toMatch(/\b(INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|TRUNCATE|GRANT|REVOKE)\s+(?:TABLE|INTO|FROM|ON|INDEX|POLICY|ROLE|FUNCTION|SCHEMA)?\b/i);
  });
  it("checks message schema", () => expect(sql).toContain("information_schema.columns"));
  it("checks foreign key constraints", () => expect(sql).toContain("contype = 'f'"));
  it("checks unique indexes", () => expect(sql).toContain("pg_indexes"));
  it("checks RLS configuration", () => expect(sql).toContain("relforcerowsecurity"));
  it("checks policy definitions", () => expect(sql).toContain("pg_policies"));
  it("checks browser grants", () => expect(sql).toContain("information_schema.role_table_grants"));
  it("explicitly blocks premature production activation", () => expect(sql).toContain("Do not enable XSUS_PRIVATE_REPLY_WRITES_ENABLED"));
});
