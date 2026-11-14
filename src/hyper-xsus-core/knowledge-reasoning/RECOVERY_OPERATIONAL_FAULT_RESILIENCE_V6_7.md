# Hyper XSUS Core v6.7 — Recovery Operational Security & Fault Resilience

Adds ten regression tests in
`tests/recovery-operational-fault-resilience-v67.test.js`.

The scenarios cover 25 authenticated append/anchor advancement cycles,
checkpoint signature tampering, signed audit payload tampering,
preservation of checkpoint pending and lock evidence, preservation
of audit pending evidence, signed audit rollback, changing state
between operational observations, known integrity exceptions, and
unexpected I/O failures.

No production recovery APIs or security contracts are changed.
All filesystem fixtures are isolated in temporary directories.

These checks are read-only and do not grant permission to resume,
automatically repair evidence, or remove locks. A two-pass assessment
is not an atomic lease; local signed storage is not a separately
trusted remote monotonic authority. Passing these tests is not a
guarantee of complete crash resilience.

Run `npm test` on `feature/xsus-ai-core` to validate the full
suite. Do not declare v6.7 verified before the test result.
The `main` branch is unchanged.
