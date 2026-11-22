# Phase 27 — Secure HTTP transport

This is a **server-side only** HTTP transport adapter for the remote sandbox provider. It pins an HTTPS origin, requires POST, requests bearer credentials from an injected provider, disables redirects, uses AbortController for timeout/cancellation, requires streamed JSON and caps the response at 64 KiB.

Use only in a trusted backend environment. Do not import this module into the XSUS App browser bundle or expose access tokens to clients. The injected fetch implementation must perform genuine TLS certificate verification; the origin check is not a substitute for DNS/egress controls or network-level SSRF protections. Authentication token rotation, service authorization, replay protection and audit logging remain external responsibilities.

This module does **not** provision a sandbox, enforce runtime CPU/memory/network isolation, verify signed attestations, or approve deployment. A real provider and end-to-end security audit are still required.
