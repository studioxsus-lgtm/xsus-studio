import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../../supabase/verification/xsus_ai_idempotency_preflight.sql", import.meta.url),
  "utf8"
);
const sql = source.replace(/--[^\n]*/g, "").trim();
describe("XSUS database idempotency preflight (read-only)", () => {
  test("01. contains only SELECT statements", () => {
    const statements = sql.split(";").map(s => s.trim()).filter(Boolean);
    expect(statements).toHaveLength(5);
    for (const statement of statements) expect(statement).toMatch(/^SELECT\s/i);
  });
  test("02. rejects mutation and privilege operations", () => {
    expect(sql).not.toMatch(/\b(INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|TRUNCATE|GRANT|REVOKE|DO|CALL|EXECUTE|SET ROLE)\b/i);
  });
  test("03. checks operation ID column metadata", () => {
    expect(sql).toMatch(/information_schema\.columns/i);
    expect(sql).toMatch(/'operation_id'/);
  });
  test("04. checks actual PostgreSQL index definitions", () => {
    expect(sql).toMatch(/FROM pg_indexes/i);
    expect(sql).toMatch(/indexdef/i);
  });
  test("05. inspects RLS flags for both private tables", () => {
    expect(sql).toMatch(/relrowsecurity/i);
    expect(sql).toMatch(/relforcerowsecurity/i);
    expect(sql).toMatch(/'ai_messages', 'ai_conversations'/i);
  });
  test("06. reads RLS policy rules and WITH CHECK", () => {
    expect(sql).toMatch(/FROM pg_policies/i);
    expect(sql).toMatch(/with_check/i);
  });
  test("07. checks foreign keys and table constraints", () => {
    expect(sql).toMatch(/FROM pg_constraint/i);
    expect(sql).toMatch(/pg_get_constraintdef/i);
  });
});
