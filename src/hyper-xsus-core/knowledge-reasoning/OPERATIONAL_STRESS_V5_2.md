# Hyper XSUS Core v5.2 — Operational Reliability & Stress Testing

Adds six regression scenarios in
`tests/recovery-operational-stress-v52.test.js`:

- 100 sequential operational reports against a stable checkpoint
- 50 concurrent reports across independently constructed instances
- 30 signed incident records and 15 repeated blocked-state assessments
- 20 parallel reports while a checkpoint pending artifact exists
- 20 parallel reports while an orphaned archive writer lock exists
- 25 reports following an explicitly authorized promotion

All reporting remains read-only. The tests verify that no implicit
checkpoint promotion, pending-file deletion, or lock cleanup occurs.

This suite tests controlled local filesystem concurrency and repeated
reads, not multi-host distributed consistency, power-failure durability,
or a universal performance benchmark. Concurrent mutation after a
report is returned remains possible.

Run `npm test` in GitHub Actions to confirm. Branch:
`feature/xsus-ai-core`; `main` unchanged.
