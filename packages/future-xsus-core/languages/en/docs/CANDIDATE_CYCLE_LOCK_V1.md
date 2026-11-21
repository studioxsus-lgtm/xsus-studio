# Candidate Cycle Lock V1

The opt-in English continual-learning candidate coordinator uses a
nonblocking POSIX advisory file lock keyed by the candidate report path.
Concurrent attempts targeting the same report path fail closed.
The lock is held through training and post-training verification.

This does not serialize runs using different report paths, prevent
remote hosts with non-shared filesystems from racing, or guarantee
rollback of partially written artifacts. Keep the training directory
private and require human authorization before any model activation.
