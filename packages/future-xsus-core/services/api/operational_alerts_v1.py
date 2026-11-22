"""Evaluate process-local metric deltas; no alert delivery or private data."""
from dataclasses import dataclass

@dataclass(frozen=True, slots=True)
class Alert:
    code: str
    count: int
    sample_size: int

def _counts(snapshot):
    if snapshot["schema"] != "xsus-intelligence-metrics-v1":
        raise ValueError("Unsupported metrics schema")
    if snapshot["latency_bucket_upper_ms"] != [5,20,100,500,2000,None]:
        raise ValueError("Unsupported latency bounds")
    total = snapshot["completed_requests"]
    classes = snapshot["status_classes"]
    statuses = [classes[k] for k in ("2xx","4xx","5xx","other","cancelled")]
    buckets = snapshot["latency_bucket_counts"]
    busy = snapshot["unavailable_responses"]
    if len(buckets) != 6 or any(type(x) is not int or x < 0 for x in [total,busy,*statuses,*buckets]):
        raise ValueError("Invalid counters")
    if sum(statuses)!=total or sum(buckets)!=total or busy>statuses[2]:
        raise ValueError("Inconsistent counters")
    return (total,*statuses,busy,*buckets)

def evaluate_window(previous, current, *, minimum_samples=20):
    if type(minimum_samples) is not int or minimum_samples < 1:
        raise ValueError("Invalid sample minimum")
    before, after = _counts(previous), _counts(current)
    delta = tuple(b-a for a,b in zip(before,after))
    if any(x<0 for x in delta):
        return {"status":"counter_reset","alerts":(),"sample_size":0}
    total, success, rejected, errors, other, cancelled, unavailable, *latency = delta
    if unavailable>errors or sum(latency)!=total or sum(delta[1:6])!=total:
        raise ValueError("Inconsistent window")
    if total<minimum_samples:
        return {"status":"insufficient_samples","alerts":(),"sample_size":total}
    alerts=[]
    for code,count,percent in (
        ("server_error_rate",errors,5),
        ("unavailable_rate",unavailable,5),
        ("slow_response_rate",sum(latency[4:]),10),
        ("client_rejection_rate",rejected,30),
        ("cancellation_rate",cancelled,10)):
        if count*100 >= total*percent:
            alerts.append(Alert(code,count,total))
    return {"status":"alert" if alerts else "normal","alerts":tuple(alerts),"sample_size":total}
