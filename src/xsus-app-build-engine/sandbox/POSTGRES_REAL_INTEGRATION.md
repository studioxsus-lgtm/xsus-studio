# Phase 61 — PostgreSQL recovery integration

Composes the Phase 59 recovery service and Phase 60 SQL adapter without changing either contract. Includes mocked end-to-end integration coverage and an **opt-in** test against an actual disposable PostgreSQL database.

Run real test only against a dedicated disposable database named `xsus_test_*` with `XSUS_REAL_PG_TEST=1` and `XSUS_TEST_DATABASE_URL`; install the `pg` driver. The test opens a transaction, creates prerequisite tables, exercises insert/deduplication/review, then rolls back. It assumes a dedicated database with permissions to create schema and tables. Do not run on Supabase production, even with a matching database name. The test does not currently cover concurrent independent connections, role/RLS authorization, crash recovery, or Docker. The regular regression suite skips the real test when the opt-in environment is absent. No database was accessed or migrated in this phase.
