# Phase 7.7 — Release gates

Local preflight covers consolidated reliability, the internal XSUS App adapter, permission denial and multi-engine coordination. Run `python -m unittest tests.integration.test_release_preflight_v1 -v` from the package directory.

Passing local tests does not certify production. Required external evidence: authenticated HTTP integration, browser end-to-end tests, production load measurements, deployment recovery, security review, operational monitoring. The internal intelligence adapter is not yet exposed through an authenticated HTTP route. No external gate is marked complete by this preflight.
