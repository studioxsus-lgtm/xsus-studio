# Transactional Learning Snapshot V1

Captures a stable, immutable copy of the English owner's accepted
feedback examples using the existing SQLite store's single SELECT.
SQLite gives the SELECT a consistent statement-level read view;
later writes cannot mutate the returned frozen Python records.

The snapshot stores the original prompt, conversation history and
response for later explicitly authorized processing. A SHA-256 digest
supports comparisons, and a follow-up read can detect additions,
removals or newly approved records.

**Important limits:** the snapshot is immutable in memory, but is not
an exclusive long-running SQLite transaction. The existing candidate
trainer still rereads the database and **does not yet consume this
frozen snapshot**. Therefore this does not guarantee training uses
the captured dataset, prevent write races, or authorize promotion.
Owner authentication and semantic language-only classification
remain integration responsibilities.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_transactional_snapshot_v1 -v`
