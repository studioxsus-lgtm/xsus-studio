# Hyper XSUS Core v2.2.0 — Real-process crash boundary tests

This phase adds integration coverage with an actual Node.js child process.
The worker writes a signed, fsynced v1.9 checkpoint, reports
`ANCHOR_DURABLE`, stays alive with an active interval, and is terminated
with `SIGKILL`. A fresh coordinator must report
`XSUS_ANCHOR_PENDING` because the trusted mark has not advanced.

Additional tests cover clean restart verification and detection when
the trusted high-water mark exceeds the newest available checkpoint.

The test's high-water provider is a **fixture**, not a secure distributed
backend: it reads a JSON file and deliberately does not implement CAS.
These tests establish process-boundary behavior only. They do not prove
fencing under concurrent machines, true durable remote CAS, or automatic
reconciliation. The recovery policy remains fail-closed and manual.

Run `npm test` (or the targeted `fenced-audit-crash-v22.test.js` file)
and review actual CI output before marking v2.2 as verified.
