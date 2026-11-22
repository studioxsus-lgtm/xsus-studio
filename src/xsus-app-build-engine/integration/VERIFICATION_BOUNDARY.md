# Phase 23 — Verification Boundary

This integration checks a prepared build against the manifest validator, quality gate, release security gate and release-readiness evidence checks.

All outputs are review-only and never authorize deployment. The quality and security gates independently re-evaluate the manifest instead of trusting the pipeline's prior inspection results.

Current known blocker: generated HTML includes a local script tag. The conservative static security gate marks ACTIVE_HTML. This is intentional and must be resolved with a vetted runtime sandbox and threat model, not by suppressing the finding.

Evidence references are caller-supplied metadata, not cryptographically verified CI attestations. No sandbox, Supabase, Render or real engine connections are made here. Run CI and verify provider results before claiming production readiness.
