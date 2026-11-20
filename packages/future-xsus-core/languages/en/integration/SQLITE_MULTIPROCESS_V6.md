# SQLite multiprocess verification V6

`test_sqlite_lease_multiprocess_v6.py` starts independent Python
interpreters against one isolated temporary SQLite database. It checks
reservation survival after a child exits, cross-process owner release,
wrong-token rejection, expiry replacement, stale-owner rejection,
concurrent contention, and duplicate protection after repeated opens.

This tests real local processes and SQLite file locking. It does **not**
prove safety across machines, network filesystems, or distributed clocks.
No production database or network route is configured. A future
production backend still requires fault-injection, time-source validation,
durability configuration, operational monitoring and fencing.
