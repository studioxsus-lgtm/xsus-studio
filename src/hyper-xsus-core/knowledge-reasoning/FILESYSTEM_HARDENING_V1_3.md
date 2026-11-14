# Hyper XSUS Core v1.3.0 — Opened-file integrity checks

Strict mode now reads the journal through a file descriptor opened with
`O_RDONLY | O_NOFOLLOW`, then verifies the opened descriptor is a regular
file with owner-only permissions on POSIX before reading its bytes.
This closes the journal-final-component symlink substitution gap in the
previous path-only preflight for platforms that implement O_NOFOLLOW.

## Compatibility
`strictFilesystem` remains opt-in. The persisted journal schema and
`PERSISTENT_DECISION_AUDIT_VERSION` remain 0.8.0 for compatibility.
Injected `fsOps.open` is honored for strict reads and fault injection.

## Remaining limitations
- Intermediate parent directories can still change after preflight.
  A race-free directory-fd/openat design is not implemented.
- The lock acquisition and release path is not yet bound to a verified
  inode across the entire lifetime; malicious filesystem writers remain
  out of the threat model.
- Atomic rename destination replacement is not protected against an
  attacker with directory write privileges.
- No external trust anchor or tamper-proof audit guarantee.
- Windows behavior for O_NOFOLLOW must be verified separately.
- Strict mode requires a trusted local filesystem and controlled directory
  permissions. Production deployment remains unverified.

## Verification
Run `npm test`, then validate the deployment filesystem and permission
model. Do not claim production readiness from these tests alone.
