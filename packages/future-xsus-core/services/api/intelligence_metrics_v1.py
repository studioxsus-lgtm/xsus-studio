"""Process-local aggregate HTTP metrics; never retain request content."""
from threading import Lock


class IntelligenceMetrics:
    def __init__(self):
        self._lock = Lock()
        self._total = 0
        self._classes = {key: 0 for key in ("2xx", "4xx", "5xx", "other", "cancelled")}
        self._busy = 0
        self._latency = [0] * 6
        self._bounds = (5, 20, 100, 500, 2000)

    def observe(self, status, elapsed_ms):
        category = ("cancelled" if status is None else
                    "2xx" if 200 <= status < 300 else
                    "4xx" if 400 <= status < 500 else
                    "5xx" if 500 <= status < 600 else "other")
        bucket = next((i for i, bound in enumerate(self._bounds)
                       if elapsed_ms <= bound), len(self._bounds))
        with self._lock:
            self._total += 1
            self._classes[category] += 1
            self._busy += int(status == 503)
            self._latency[bucket] += 1

    def snapshot(self):
        with self._lock:
            return {"schema": "xsus-intelligence-metrics-v1",
                    "completed_requests": self._total,
                    "status_classes": dict(self._classes),
                    "unavailable_responses": self._busy,
                    "latency_bucket_upper_ms": [*self._bounds, None],
                    "latency_bucket_counts": list(self._latency),
                    "scope": "process_local",
                    "persistent": False}
