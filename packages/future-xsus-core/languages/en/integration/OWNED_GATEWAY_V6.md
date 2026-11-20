# Owned Gateway V6 (experimental)

`dispatch_owned_v6` composes upstream-authorized scopes, a per-call budget,
an in-process ownership-token reservation store, and the existing V6
transport adapter. It is disabled by default and does not register a
network route. Successful requests retain their reservation until expiry;
exceptions and rejected responses release it using their owner token.

Limitations: no network authentication, actual rate limiter, execution
timeout, durable result cache, or cross-server atomicity. The reservation
may expire while a long-running operation is still executing. This is
not an exactly-once guarantee. A production integration needs a shared
lease service, robust renewal/fencing and verified upstream identity.
