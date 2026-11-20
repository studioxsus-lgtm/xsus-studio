# Audit Anchor Store V1

Creates a JSON checkpoint file separately from the chain SQLite DB,
using exclusive file creation, restrictive permissions and fsync.
Existing files are never overwritten by the API. Loading rejects
symlinks and oversized/non-regular files. Verification delegates
to the HMAC-SHA256 audit head anchor verifier.

**Not external trust:** a local file on the same machine is not an
independent immutable archive. A privileged attacker can change
both databases and local files; directory ancestor symlinks and
platform-specific filesystem races are not fully prevented. The
HMAC key must be stored separately and securely by the caller.
There is no automatic key rotation, remote upload, model release
or deployment. A single checkpoint filename intentionally does
not support replacing an old checkpoint: use a separately designed
versioned archive for future checkpoints.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_audit_anchor_store_v1 -v`
