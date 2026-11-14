# Hyper XSUS Core v5.9 — Recovery Audit Reliability & Stress Testing

This phase adds **eight regression/stress tests** for the existing v5.7
authenticated durable audit and v5.8 read-only integrity assessment.

Coverage:
1. 80 sequential authenticated appends and independent fresh-reader verification.
2. 30 parallel independent anchored prefix assessments.
3. 20 fresh-instance append/reopen cycles.
4. 25 parallel pending-artifact checks without automatic cleanup.
5. 25 parallel writer-lock checks without lock stealing.
6. 20 independent assessments of a valid signed snapshot rolled back
   behind a retained trusted anchor.
7. 15 different signed-payload corruption cases, preserving the damaged bytes.
8. Capacity overflow attempts that preserve all 12 committed records.

These tests deliberately avoid claiming multi-host coordination or
atomic read leases. An independently retained anchor is essential to
detect rollback of a valid authenticated snapshot. No production
API, authorization, promotion, repair, or cleanup behavior is changed.

Run `npm test` in GitHub Actions and inspect failures before marking
v5.9 verified. The earlier v5.8 phase also awaits explicit CI
confirmation. Only branch `feature/xsus-ai-core` was changed; `main`
remains untouched.
