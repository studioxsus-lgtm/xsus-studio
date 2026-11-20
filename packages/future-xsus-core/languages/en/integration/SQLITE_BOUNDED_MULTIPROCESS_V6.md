# SQLite bounded lease — cross-process verification

Eight tests run independent Python interpreters against a shared
temporary SQLite file. They check the per-database atomic capacity
limit, duplicate precedence, token-bound release, expiry cleanup,
concurrent contention and capacity persistence across reopen.

The test environment uses local filesystem locks and caller-supplied
synthetic UTC time. This does not establish multi-host or network
filesystem correctness, production rate limiting, fencing or
power-loss durability. No external services or XSUS App routes change.
