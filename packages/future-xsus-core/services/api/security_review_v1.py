"""Track review evidence without treating self-reported evidence as authorization."""
from services.api.production_acceptance_v1 import EXTERNAL_GATES
import re

def review_inventory(records):
    if type(records) is not dict or set(records)-set(EXTERNAL_GATES):
        raise ValueError("Unknown evidence gates")
    rows=[]
    for gate in EXTERNAL_GATES:
        record=records.get(gate)
        if record is None:
            rows.append({"gate":gate,"status":"missing"})
            continue
        if type(record) is not dict or set(record)!={"commit","digest","outcome"}:
            raise ValueError("Invalid evidence record")
        for key,size in (("commit",40),("digest",64)):
            if type(record[key]) is not str or not re.fullmatch(r"[0-9a-f]{"+str(size)+"}",record[key]):
                raise ValueError("Invalid evidence identifier")
        if record["outcome"] not in ("pass","fail"):
            raise ValueError("Invalid outcome")
        rows.append({"gate":gate,"status":"reported_"+record["outcome"]})
    return {"schema":"xsus-security-review-v1","gates":rows,
            "missing":sum(r["status"]=="missing" for r in rows),
            "reported_failures":sum(r["status"]=="reported_fail" for r in rows),
            "production_ready":False,"deployment_authorized":False,
            "limitations":["evidence_not_independently_authenticated","manual_security_review_required"]}
