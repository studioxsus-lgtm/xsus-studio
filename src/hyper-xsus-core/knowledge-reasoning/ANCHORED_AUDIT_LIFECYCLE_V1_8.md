# Hyper XSUS Core v1.8.0 — Opt-in anchored lifecycle

`createAnchoredDecisionAudit({audit,anchorStore})` wraps the existing
persistent journal with externally authenticated checkpoint verification.

A trusted operator must provision the anchor first using
`createAuditAnchorStore(...).initialize(validatedJournalSnapshot)` in a
separately controlled trust domain. The wrapper deliberately does not
auto-create or overwrite a missing checkpoint.

On `load()`, it loads the journal and verifies the anchor. On
`append()`, it verifies the last in-memory snapshot, delegates the
write to the existing journal engine, then verifies the new snapshot.
Any verification failure closes the wrapper to subsequent operations.

## Important limitations

This is a *lifecycle adapter*, not an atomic transaction spanning the
journal and external checkpoint. It does not automatically advance or
rotate anchors. The immutable v1.7 checkpoint remains at its original
sequence; eventually bounded journal retention makes verification
unverifiable and the wrapper correctly fails closed. Safe checkpoint
advancement, a durable remote trust store and crash-consistent
cross-store coordination require a separate design.

Concurrent external writers may advance the journal between wrapper
checks. Underlying journal locking still handles concurrent writes;
external verification only authenticates history that remains
observable in the retained journal.

The `audit` and `anchorStore` dependencies should be explicitly
injected and the journal snapshot must come from the validated
persistent engine. Never store the only checkpoint beside the journal
under the same writable principal.

Run `npm test`; the five new tests cover restart, missing anchor,
rollback, signature tampering, and tampering after load. No production
certification is implied.
