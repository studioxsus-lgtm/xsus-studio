# Owned replay reservations V6

`OwnedReplayStoreV6` provides a process-local atomic reserve operation that
returns a random opaque ownership token only to the winning caller. A
compare-and-release operation removes the reservation only if its token
matches. Expired reservations may be replaced; old tokens cannot release
new reservations.

This is a reference implementation and is not connected to the active
V6 gateway. A distributed store must implement atomic compare-and-delete
and TTL semantics in the datastore itself, plus trusted identity, crash
recovery and monitoring. Tokens must be treated as secrets. No production
XSUS App integration is activated.
