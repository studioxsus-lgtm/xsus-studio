# Hyper XSUS Core — Health History Reliability Milestone v5.0.0

Status: implemented; awaiting GitHub Actions confirmation for this milestone.

## Scope

- v4.3.0: bounded immutable, in-memory advisory health observations and trends.
- v4.4.0: separate persistent JSON health history; `load`, `save`, `append`, `close`; per-instance serialization, cooperating-writer exclusive file lock and atomic replacement.
- v4.5.0: failure-injection tests for pre-rename and post-rename failures, invalid committed data and orphan temporary files.
- v4.6.0: cross-process lock refusal, fresh-process writes and same-instance queued append stress.
- v4.7.0–v4.8.0: SIGKILL after commit and during lock ownership; manual-only stale lock handling; repeated restart tests.
- v4.9.0: bounded-retention stress, SHA-256 byte consistency checks and corruption refusal.
- v5.0.0: combined regression tests for bounded persistence, lock safety and immutable snapshots.

## Behavioral contract

- History persistence is **separate** from the transaction journal; it is not an atomic multi-file transaction.
- The committed format is `{version:"4.4.0",entries:[...]}`. v5.0 is a reliability milestone, **not** a file-format or API version bump.
- `maxEntries` is an integer from 1 to 10000; retention discards oldest observations once capacity is reached.
- The `append` operation reloads committed history while holding the cooperating-writer lock, validates, and atomically replaces the JSON file.
- A busy lock rejects writes with `XSUS_FILE_LOCK_BUSY`; the caller must decide whether and when to retry.
- Invalid committed JSON or entries fail closed. No automatic repair, restoration, lock removal or temp cleanup.
- Health reports and trend observations are advisory; timestamps and file-state checks do not constitute a globally consistent snapshot.

## Explicit limitations

- SHA-256 comparisons in tests detect byte changes; they do not establish authenticity or tamper resistance.
- The atomic writer requests file and directory fsync, but there is no verified guarantee for sudden power loss, faulty storage, remote filesystems or non-cooperating writers.
- SIGKILL **after** a successful commit is tested. These tests do not prove arbitrary instruction-level crash consistency during a write.
- SIGKILL during lock ownership can leave a lock file; automatic stale-lock stealing is deliberately disabled. Only a verified, explicit operator procedure may release an orphan lock.
- A successful operation is not a distributed commit and does not imply durable backups.
- This milestone does **not** declare the entire Knowledge Graph engine complete.

## Acceptance gate

1. GitHub Actions passes the v5.0 milestone test and all existing Hyper XSUS Core/Knowledge Graph tests.
2. No regressions to v4.3–v4.9 contracts or API shapes.
3. No changes to `main`.
4. The limitations above remain documented and are not represented as stronger guarantees.

Only mark this milestone verified after the actual CI results are confirmed.
