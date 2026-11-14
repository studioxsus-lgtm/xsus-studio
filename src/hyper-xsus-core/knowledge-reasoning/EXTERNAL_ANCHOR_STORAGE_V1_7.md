# Hyper XSUS Core v1.7.0 — External anchor storage

The new `createAuditAnchorStore({filePath,key,keyId})` API exposes
`initialize(snapshot)`, `read()`, and `verify(snapshot)`.

- `initialize` creates a new checkpoint with exclusive `O_EXCL` creation
  and owner-only file permissions; existing checkpoints are not overwritten.
- `verify` reloads a checkpoint after restart and authenticates its HMAC
  signature against the supplied audit snapshot.
- Missing checkpoints, signature tampering, rollback, and unverifiable
  retention histories fail closed.
- Checkpoints are immutable by this API. Deliberate rotation and advancement
  require a separately designed trusted protocol; do not delete checkpoints
  merely to update them.

## Deployment boundaries

The checkpoint must live outside the journal's trust boundary, with a
different access policy and an independently managed secret. A local
checkpoint under the same writable directory is not an external trust
anchor. The implementation does not provide remote object storage,
append-only infrastructure, key rotation, secure parent-directory traversal,
or a crash-atomic replacement protocol. Filesystem directory permissions
and durability semantics must be validated on the target host.

This component is not automatically wired into journal append/load. Its
`read()` result is untrusted until `verify(snapshot)` authenticates it.
The journal snapshot must be validated by the existing audit engine first.

Run `npm test` and review seven new focused tests. Do not certify
production readiness based on unit tests alone.
