"""Bounded deterministic stress harness and per-request failure isolation.

This is a local regression harness, not a concurrency or production-load test.
"""
from dataclasses import dataclass
from .unified_pipeline_v1 import PipelineRequest, UnifiedIntelligencePipeline

MAX_REQUESTS = 64
MAX_ROUNDS = 100


@dataclass(frozen=True, slots=True)
class StressOutcome:
    request_id: str
    status: str
    fingerprint: tuple
    error_type: str | None


@dataclass(frozen=True, slots=True)
class StressReport:
    status: str
    rounds: int
    executions: int
    failures: int
    nondeterministic_ids: tuple[str, ...]
    outcomes: tuple[StressOutcome, ...]
    limitations: tuple[str, ...]


class ResilienceHarness:
    def __init__(self, pipeline=None):
        self.pipeline = pipeline if pipeline is not None else UnifiedIntelligencePipeline()

    def run(self, requests: tuple[PipelineRequest, ...], *, rounds: int = 10) -> StressReport:
        if not isinstance(requests, tuple) or not 1 <= len(requests) <= MAX_REQUESTS:
            raise ValueError("requires 1 to 64 requests")
        if any(not isinstance(r, PipelineRequest) for r in requests):
            raise ValueError("invalid request")
        if len({r.request_id for r in requests}) != len(requests):
            raise ValueError("duplicate request IDs")
        if type(rounds) is not int or not 1 <= rounds <= MAX_ROUNDS:
            raise ValueError("rounds must be between 1 and 100")
        baselines = {}
        inconsistent = set()
        outcomes = []
        failures = 0
        for _ in range(rounds):
            for request in requests:
                try:
                    response = self.pipeline.run(request)
                    fingerprint = (response.status, response.answer,
                                   response.evidence, response.steps,
                                   response.verified, response.limitations)
                    outcome = StressOutcome(request.request_id, response.status,
                                            fingerprint, None)
                except Exception as exc:
                    # Deliberate containment at the request boundary; do not
                    # disclose exception text, which may include sensitive data.
                    outcome = StressOutcome(request.request_id, "exception", (),
                                            type(exc).__name__)
                if outcome.status in ("exception", "error"):
                    failures += 1
                fingerprint = (outcome.status, outcome.fingerprint, outcome.error_type)
                if request.request_id in baselines and baselines[request.request_id] != fingerprint:
                    inconsistent.add(request.request_id)
                baselines.setdefault(request.request_id, fingerprint)
                outcomes.append(outcome)
        return StressReport("pass" if not failures and not inconsistent else "fail",
                            rounds, rounds * len(requests), failures,
                            tuple(sorted(inconsistent)), tuple(outcomes),
                            ("sequential_in_process_only", "no_latency_sla",
                             "no_parallelism_or_crash_recovery_claim"))
