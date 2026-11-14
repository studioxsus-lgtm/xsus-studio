# Hyper XSUS Core v1.4.0 — Lock ownership validation

## Implemented
The audit writer now compares the held lock descriptor's device/inode
identity against the current sidecar lock directory entry before unlinking.
A mismatch, symlink substitution, or missing lock causes a fail-closed
XSUS_AUDIT_LOCK_CHANGED (or filesystem) error. The held descriptor is closed
even when verification fails; a foreign replacement is not removed.

## Limitations
The check and unlink remain two distinct filesystem operations. A malicious
actor with write permission to the parent directory can still race between
them. This change is defense in depth, not a race-free lock protocol.
Secure deployments must restrict parent directory mutation to the trusted
service account. No cross-host lock guarantees are provided.

## Acceptance
- Run `npm test` on the feature branch.
- Confirm the three new lock ownership tests.
- Verify behavior on the actual deployment filesystem.
- Review orphan-lock recovery, permissions and backups before production.

The persistent journal schema remains v0.8.0; this is a v1.4.0
hardening phase, not a breaking journal-format upgrade.
