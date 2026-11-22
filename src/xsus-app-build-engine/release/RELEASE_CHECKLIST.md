# XSUS App Build Engine — Release candidate checklist

This is a **review-only** release process. The existence of these modules is not proof of production readiness.

1. Run the entire repository test suite on the dedicated branch, record the exact CI run and resolve failures.
2. Run end-to-end tests for the core orchestrator, Future XSUS language adapter and Hyper XSUS intelligence adapter.
3. Verify a real isolated sandbox provider enforces network, filesystem, CPU and memory restrictions.
4. Run dependency and secret scanning, and review the limitations of regex-based HTML inspection.
5. Test a deployment dry-run against an explicitly configured provider without changing production.
6. Verify Supabase ownership policies and FORCE RLS against authenticated and unauthenticated users in a dedicated test database.
7. Validate the actual artifact digest with a trusted SHA-256 implementation; never substitute a placeholder.
8. Obtain explicit human release approval, publish to staging, and monitor errors and rollback procedures.

Release readiness assessment is deliberately fail-closed and does not publish or approve production releases.
