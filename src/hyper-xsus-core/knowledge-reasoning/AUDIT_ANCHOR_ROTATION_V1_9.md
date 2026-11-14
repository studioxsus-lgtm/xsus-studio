# Hyper XSUS Core v1.9.0 — Immutable anchor rotation

`createRotatingAuditAnchors({directory,key,keyId})` provides:
- `rotate(validatedSnapshot)`: create a signed checkpoint at a strictly higher
  sequence using exclusive file creation and fsync of file and directory.
- `verify(validatedSnapshot)`: reload the highest numbered checkpoint and
  verify it against the journal, including after process restart.
- `list()`: enumerate immutable checkpoint sequences, rejecting malformed
  checkpoint filenames.

Checkpoints are stored as `anchor-0000000000000001.json` etc.
Older checkpoints are retained for forensics; only the newest is checked
against the live journal because bounded retention makes old checkpoints
unverifiable. The secret and checkpoint directory must be protected by
an independent security principal.

## Crash and security limitations

An interruption during exclusive checkpoint creation may leave a partial
checkpoint file. It is **not** automatically deleted, skipped or repaired:
subsequent verification fails closed. Manual incident review is required.
This implementation does not guarantee atomic multi-store commits, external
timestamping, append-only OS policy, secure parent directory traversal,
or detection of deletion of the newest checkpoint by an attacker who can
write to the checkpoint directory. A trusted external high-water mark or
remote immutable store is necessary for stronger rollback protection.

This module is not yet automatically invoked by the v1.8 lifecycle
adapter. Rotation must be orchestrated by a trusted caller. A journal
snapshot must first be validated by the persistent audit engine.

Run the seven focused v1.9.0 tests and the full suite before treating
this phase as verified.
