# Phase 24 — Sandbox verification boundary

The current sandbox runner returns `verifiedIsolation: false` unconditionally. A successful provider response is therefore **not** proof of isolation. The integration gate fails closed when isolation is unverified, execution fails, diagnostics contain errors, or the project identity does not match.

A trusted runner could report `verifiedIsolation: true`, but the integration gate does not independently attest the provider. This must only be connected to a separately audited runtime that enforces CPU/memory/network/filesystem limits and produces verifiable evidence. Never set this flag to true merely to satisfy tests.

Passing sandbox verification does not authorize deployment or override static security findings, release readiness or human approval.
