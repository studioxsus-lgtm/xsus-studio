# Process boundary V6: verified limitations

The test module `test_lease_process_boundary_v6.py` launches real Python
subprocesses. It verifies a child can reserve and reject duplicates within
one process, and that an abrupt exit (`os._exit(23)`) terminates the child.
It also demonstrates that a new process can reserve the same key because
`OwnedReplayStoreV6` holds all state in private process memory.

**This is a negative durability test, not crash recovery.** No state
survives process termination and there is no cross-worker replay defense.
The subprocesses do not connect to Redis, PostgreSQL, or XSUS App.

A shared backend is required before claims about durable replay protection.
Future tests must validate cross-process atomic reserve, process termination,
lease expiry, compare-and-release, and recovery using a real isolated backend.
