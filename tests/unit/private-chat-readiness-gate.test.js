import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const sql = readFileSync(
  new URL("../../supabase/verification/xsus_private_chat_readiness_gate.sql", import.meta.url),
  "utf8"
);
const executable = sql.split("\n").filter(line => !line.trim().startsWith("--")).join("\n");

describe("Private chat Supabase readiness gate", () => {
  it("contains only a read-only SQL statement", () => {
    expect(executable.trim()).toMatch(/^WITH\s+checks\s+AS\s*\(/i);
    // Ignore SQL single-quoted string literals (including doubled quote escapes)
    // before scanning for mutating SQL keywords.
    const withoutLiterals = executable.replace(/'(?:''|[^'])*'/g, "''");
    expect(withoutLiterals).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|TRUNCATE|GRANT|REVOKE)\b/i);
  });
  it("checks forced RLS on both tables", () => {
    expect(sql).toContain("relforcerowsecurity");
    expect(sql).toContain("public.ai_messages");
    expect(sql).toContain("public.ai_conversations");
  });
  it("checks composite ownership and unique operation", () => {
    expect(sql).toContain("composite_owner_fk");
    expect(sql).toContain("operation_unique");
    expect(sql).toContain("pg_constraint c");
    expect(sql).toContain("pg_index i");
    expect(sql).toContain("indisvalid");
    expect(sql).toContain("indimmediate");
    expect(sql).toContain(String.raw`operation_id\s+IS\s+NOT\s+NULL`);
  });
  it("checks restricted authenticated inserts", () => {
    expect(sql).toContain("user_only_insert_policy");
    expect(sql).toContain("no_public_message_insert_policy");
    expect(sql).toContain("regexp_replace(with_check");
    expect(sql).toContain("auth.uid()");
    expect(sql).toContain(String.raw`role\s*=\s+\x27user\x27`);
  });
  it("produces explicit PASS or FAIL rows", () => {
    expect(sql).toContain("'PASS'");
    expect(sql).toContain("'FAIL'");
  });
});
