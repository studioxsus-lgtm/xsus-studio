# Replay Guard V6

The replay guard is opt-in, in-memory and single-process. It reserves a
(subject, request_id) pair while dispatching and retains successful pairs
until the request envelope expires. Repeated pairs are rejected. It never
uses the request payload as a trusted subject.

It does not protect across processes, restarts or deployments. Capacity is
bounded and failures release reservations. Production requires a shared
atomic TTL store, verified upstream identities, actual request budgets,
and replay monitoring. No public XSUS App route is enabled here.
