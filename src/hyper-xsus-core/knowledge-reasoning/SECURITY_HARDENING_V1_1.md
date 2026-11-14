# Hyper XSUS Core — Security Hardening & Production Validation v1.1.0

## Scope of this increment
- Independent Node child-process test: one process commits receipt #2,
  another process loads the same committed journal and commits #3.
- Independent live-lock contention test: a second process receives
  XSUS_AUDIT_LOCKED while another process owns the sidecar lock; the
  committed journal remains byte-for-byte unchanged.
- A subsequent process can append after the lock is explicitly released.

## Security boundaries and open risks
- The lock relies on exclusive creation on the same filesystem. It is not
  a distributed lock or a defense against malicious filesystem writers.
- The current audit engine does not establish an external cryptographic
  trust anchor; an attacker with write access can replace a complete chain.
- An orphaned lock requires operator verification before removal.
- File permissions, symlink and path substitution, backup/restore,
  deployment-specific durability and multi-host behavior require further
  engineering and validation.
- A read-only audit snapshot on a stale instance is not automatically
  refreshed by another writer; reload a new instance to inspect the
  committed state.
- Production authorization must be supplied by a trusted secure evidence
  provider; the pipeline constructor cannot authenticate arbitrary adapters.

## Acceptance status
Implementation and tests are committed, but no test execution has been
reported for this increment. Production readiness remains NOT VERIFIED.

Run `npm test` and separately validate the target deployment filesystem
and threat model. Do not merge or deploy as production-ready solely on
the basis of these unit/integration tests.
