# Hyper XSUS Core v4.1 — Incident Recovery Integration

`createIncidentRecoveryIntegration({...})` composes the existing
v3.6 authenticated archive, v3.8 trusted-prefix guard, v3.9
reviewer-authorized CAS promotion, and v4.0 durable local checkpoint.

Inputs: `archiveDirectory`, `checkpointDirectory`, `archiveKey`,
`checkpointKey`, `archiveKeyId`, `checkpointKeyId`, and
`authorize` (an explicit async/sync reviewer callback returning true).

Public API: `initializeCheckpoint()`, `recordIncident(report)`,
`inspect()`, `promote()`, `readCheckpoint()`, `verifyArchive()`.

The integration does not automatically initialize, approve, recover,
remove stale locks, repair evidence or promote unanchored records.
It refuses promotion if the archive is rolled back, forked, locked
or corrupt. Local checkpoint durability is not an independently
protected external anchor: the deployment must separate and protect
the key and storage trust domains.

A new 15-case end-to-end test suite covers restart, reviewer denial,
two-batch promotion, lock contention, archive corruption and rollback,
checkpoint corruption, and 12 reviewed sequential batches.

This is single-host integration, not multi-host consensus or a
production disaster-recovery guarantee. CI test results must be
confirmed before calling v4.1 verified. Work is confined to
`feature/xsus-ai-core`; `main` is untouched.
