# Hyper XSUS Core v4.4 — Recovery Readiness Gate

Adds `recovery-readiness-guard.js` and the additive
`inspectReadiness()` method to the existing v4.1 recovery
integration. Existing `inspect()`, `promote()`, `recordIncident()`,
and checkpoint APIs remain unchanged.

The read-only gate checks:
- orphaned archive `writer.lock` directory;
- orphaned checkpoint `checkpoint.lock` directory;
- interrupted checkpoint `checkpoint.pending` file;
- unsafe symlink or wrong-type lock/pending artifacts;
- the existing signed-archive trusted-prefix inspection;
- whether filesystem residue changed during the inspection.

It returns `{version,status,safeToResume,blockers,core}`
with immutable top-level and blockers array, or fails closed
on unsafe or changing filesystem artifacts.

**Important limitation:** `inspectReadiness()` is an additional
read-only diagnostic gate, not yet a mandatory gate enforced
inside `promote()`. Callers must require `safeToResume===true`
before resuming operations. There is no automatic lock cleanup,
file repair, or claim of power-loss/fsync-boundary testing.
Two-pass filesystem checks reduce but do not eliminate TOCTOU
races; directory and key protection remain operator responsibilities.

Eleven new tests cover consistent state, unanchored tails,
orphaned locks, pending writes, unsafe artifacts and API
compatibility. CI verification is pending. Branch:
`feature/xsus-ai-core`; `main` untouched.
