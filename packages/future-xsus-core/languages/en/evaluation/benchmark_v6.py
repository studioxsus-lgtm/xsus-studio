"""Repeatable V6 batch benchmark; timing is observational, not a pass criterion."""
from dataclasses import asdict, dataclass
from time import perf_counter
from ..text.batch_api_v6 import analyze_batch_v6

@dataclass(frozen=True, slots=True)
class BenchmarkReport:
    iterations: int
    samples_per_iteration: int
    total_items: int
    failures: int
    elapsed_seconds: float
    items_per_second: float
    deterministic: bool

def benchmark_batch_v6(samples: list[str] | tuple[str, ...], *, iterations: int = 5) -> BenchmarkReport:
    if not isinstance(samples, (list, tuple)) or not samples:
        raise ValueError("samples must be a nonempty list or tuple")
    if len(samples) > 32 or any(not isinstance(x, str) for x in samples):
        raise ValueError("samples must contain at most 32 strings")
    if not isinstance(iterations, int) or isinstance(iterations, bool) or not 1 <= iterations <= 100:
        raise ValueError("iterations must be an integer between 1 and 100")
    baseline = None
    deterministic = True
    failures = 0
    started = perf_counter()
    for _ in range(iterations):
        result = analyze_batch_v6(samples)
        failures += result["failed"]
        if baseline is None:
            baseline = result
        elif result != baseline:
            deterministic = False
    elapsed = perf_counter() - started
    total = len(samples) * iterations
    return BenchmarkReport(
        iterations, len(samples), total, failures, elapsed,
        total / elapsed if elapsed > 0 else 0.0, deterministic,
    )
