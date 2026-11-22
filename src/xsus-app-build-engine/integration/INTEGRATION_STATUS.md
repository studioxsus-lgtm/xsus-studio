# Phase 21 — Full Engine Integration & Verification

The pipeline connects: core orchestrator → optional Future XSUS language adapter → optional Hyper XSUS intelligence adapter → project architect → static generator → build manifest validator → release security inspection.

This is a **review-only integration slice**. It does not call a real language or intelligence service, execute generated code, enforce a sandbox, persist to Supabase, or deploy to Render/GitHub Pages.

Important known blocker: the generated index.html includes a local script tag, which the current conservative release security gate flags as ACTIVE_HTML. Do not suppress this finding merely to make tests pass. A safe policy distinguishing vetted first-party local scripts from untrusted HTML requires separate threat modeling and runtime verification.

Tests must be executed in CI and their results recorded before calling this verified. Do not mark production-ready or merge to main based on code creation alone.
