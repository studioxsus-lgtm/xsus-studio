# Phase 67 — bounded concurrency and load admission

Adds a process-local FIFO limiter with maximum active builds, bounded waiting queue, queued-request cancellation, and guaranteed slot release on task resolution or rejection. The load-controlled wrapper composes the Phase 66 security pipeline and holds a slot until the result receipt operation completes.

This is **not** a distributed lease, globally unique execution coordinator, or a load test against real Docker. For multi-instance Render deployment, use the existing durable PostgreSQL lease/fencing design and a trusted distributed admission mechanism. The limiter does not terminate a task already running when its signal aborts; that responsibility remains with the runtime cancellation boundary. The tests use synthetic asynchronous tasks. CI results require independent verification.
