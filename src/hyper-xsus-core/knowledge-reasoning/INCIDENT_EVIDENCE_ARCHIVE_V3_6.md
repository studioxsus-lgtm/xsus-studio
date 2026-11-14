# Hyper XSUS Core v3.6 — Authenticated Incident Evidence Archive

## Implementation
`incident-evidence-archive.js` introduces an independently callable,
read-only-verifiable incident evidence log. Every record contains a
canonical decision from the v3.5 incident policy, a strictly increasing
archive sequence, the previous record signature, and a HMAC-SHA256
signature. Files are created exclusively with 0600 permissions and
fsynced before returning. The directory is also fsynced.

The API is `createIncidentEvidenceArchive({directory,key,keyId})`,
returning `{version,record(report),verify()}`. It does **not** modify
trusted high-water marks, recover journals, release locks, or fabricate
missing receipts.

## Test coverage
20 new Vitest scenarios cover:
- sequential records, restart verification, and 60 signed appends;
- wrong keys, wrong key IDs, tampering, forged signatures, broken chains;
- missing earlier/middle files, malformed JSON and noncanonical payloads;
- invalid incident decisions and input validation;
- competing append operations and frozen verification results.

## Security limitations
This is **not** an external trust anchor. Deletion of the *latest* record
or complete archive rollback cannot be detected without a separately
trusted, durable high-water reference. A privileged adversary with the
signing key can forge an archive. An interrupted write may leave an
incomplete file and deliberately block subsequent appends until manual
review. No automatic lock removal, rollback or repair is implemented.

All changes target `feature/xsus-ai-core`, leaving `main` untouched.
Run `npm test` and inspect the CI logs before treating v3.6 as verified.
