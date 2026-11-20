# V6 diagnostic integration boundary

The V6 analysis stack is experimental, opt-in and disabled by default.

## Data flow

1. `protocol_v6.handle_json_v6` validates bounded JSON input.
2. `gateway_v6.dispatch_v6` checks explicit `enabled=True`.
3. `adapter_v6.handle_diagnostic_request_v6` checks contract, operation and request identifier.
4. `analysis_api_v6.analyze_text_v6` or `batch_api_v6.analyze_batch_v6` performs deterministic, heuristic diagnostics.

## Invariants

- The default gateway response is `FEATURE_DISABLED`.
- No web server, authentication system or XSUS App production route is installed.
- Unknown operations and request fields are rejected when enabled.
- No tools, external APIs, models, or shell commands are executed.
- No input or conversation history is persisted.
- The language diagnostics are not fact verification or general-purpose language generation.

## Activation requirements before any public use

A separate deployment integration must implement authentication, authorization,
rate limiting, operational logging with privacy controls, transport security,
and explicit rollout/rollback mechanisms. Passing local tests is not
production-readiness certification.
