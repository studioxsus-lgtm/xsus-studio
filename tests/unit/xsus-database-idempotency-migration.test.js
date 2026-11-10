/**
 * XSUS AI V3 — Database Idempotency Migration Contract
 * Phase 22.16.5.8.11 — static SQL safety checks only.
 * No database connection, no migration execution, no RLS verification.
 */
import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";

const sql = readFileSync(
  new URL("../../supabase/migrations/20261110_xsus_ai_message_operation_id.sql", import.meta.url),
  "utf8"
);
const statements = sql.replace(/--[^\n]*/g, "").replace(/\s+/g, " ").trim();

describe("XSUS AI database idempotency migration contract", () => {
  test("01. targets only the existing private message table", () => {
    expect(statements).toMatch(/ALTER TABLE public\.ai_messages\s+ADD COLUMN/i);
    expect(statements).not.toMatch(/DROP\s+(TABLE|COLUMN|SCHEMA)/i);
  });

  test("02. preserves legacy messages with a nullable UUID operation ID", () => {
    expect(statements).toMatch(/ADD COLUMN IF NOT EXISTS operation_id uuid\s*;/i);
    expect(statements).not.toMatch(/operation_id\s+uuid\s+NOT NULL/i);
  });

  test("03. scopes uniqueness by owner, conversation, and operation", () => {
    expect(statements).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS\s+ai_messages_user_conversation_operation_unique/i);
    expect(statements).toMatch(/ON public\.ai_messages\s*\(user_id, conversation_id, operation_id\)/i);
  });

  test("04. excludes legacy NULL operation IDs from uniqueness", () => {
    expect(statements).toMatch(/WHERE operation_id IS NOT NULL\s*;/i);
  });

  test("05. is transactional and does not modify access policies", () => {
    expect(statements).toMatch(/^BEGIN\s*;/i);
    expect(statements).toMatch(/COMMIT\s*;$/i);
    expect(statements).not.toMatch(/\b(CREATE|ALTER|DROP)\s+POLICY\b/i);
    expect(statements).not.toMatch(/DISABLE ROW LEVEL SECURITY/i);
  });

  test("06. does not install privileged functions or security-definer code", () => {
    expect(statements).not.toMatch(/SECURITY DEFINER/i);
    expect(statements).not.toMatch(/CREATE\s+(OR REPLACE\s+)?FUNCTION/i);
    expect(statements).not.toMatch(/GRANT\s+/i);
  });
});
