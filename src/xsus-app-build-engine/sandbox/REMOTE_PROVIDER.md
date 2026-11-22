# Phase 26 — Remote sandbox provider contract

The remote provider adapter pins a HTTPS origin, validates manifests, restricts the requested sandbox policy, and validates the shape of returned diagnostics.

This is **not** a deployed or audited sandbox. The transport is injected and must separately enforce service authentication, TLS verification, no redirects, DNS/egress restrictions, response-size caps, hard timeouts and error handling. The endpoint in tests is fictitious and does not imply an available service.

The provider never manufactures isolation evidence. The trusted runtime adapter must verify a cryptographically authenticated attestation bound to the execution ID, project, artifact digest and policy. No such verifier or trusted runtime service is configured here.

Before live integration: deploy a sandbox service with enforceable network/filesystem/CPU/memory isolation, audit the transport and attestation trust chain, and perform adversarial runtime tests. Never expose service credentials in frontend code.
