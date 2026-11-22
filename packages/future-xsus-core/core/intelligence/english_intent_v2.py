"""Controlled English commands; never invent facts or infer permissions."""
import re
from dataclasses import dataclass
from .reasoning_v1 import _atom
from .request_router_v2 import RequestRouter

ATOM = r"[a-z][a-z0-9_]{0,63}"
FLAGS = re.ASCII | re.IGNORECASE
PATTERNS = (
    ("reason", re.compile(rf"(?:prove|can you prove) ({ATOM})\??", FLAGS)),
    ("reason", re.compile(rf"is ({ATOM}) provable\??", FLAGS)),
    ("infer", re.compile(rf"infer ({ATOM}) from my knowledge\??", FLAGS)),
    ("search", re.compile(rf"find alternative proofs for ({ATOM})\??", FLAGS)),
    ("solve", re.compile(rf"solve ({ATOM}(?:, {ATOM}){{0,30}}(?: and {ATOM})?)", FLAGS)),
)

@dataclass(frozen=True, slots=True)
class Intent:
    status: str
    operation: str | None
    goals: tuple[str, ...]
    limitations: tuple[str, ...] = ("controlled_english_only","formal_symbols_only")

def parse_english(text):
    if type(text) is not str or not 1 <= len(text) <= 2000 or not text.strip():
        raise ValueError("Invalid text")
    normalized = " ".join(text.strip().split())
    matches = [(op,m.group(1)) for op,p in PATTERNS if (m:=p.fullmatch(normalized))]
    if len(matches)!=1:
        return Intent("abstained",None,())
    op, raw=matches[0]
    goals=tuple(_atom(a.lower()) for a in re.split(r", | and ",raw,flags=FLAGS))
    if len(set(goals))!=len(goals):
        return Intent("ambiguous",None,())
    return Intent("resolved",op,goals)

class EnglishRequestBridge:
    def __init__(self, router):
        if not isinstance(router,RequestRouter):
            raise ValueError("Router required")
        self.router=router

    def route(self, principal, request_id, text, *, facts=(), rules=()):
        intent=parse_english(text)
        if intent.status!="resolved":
            return intent
        op=intent.operation
        if op=="infer":
            if facts != ():
                raise ValueError("Knowledge inference cannot accept caller facts")
            payload={"query":intent.goals[0],"rules":rules}
        else:
            payload={"facts":facts,"rules":rules}
            if op=="reason":
                payload["queries"]=intent.goals
            elif op=="solve":
                payload["goals"]=intent.goals
            else:
                payload["query"]=intent.goals[0]
        return self.router.route(principal,{"version":"2.0.0","request_id":request_id,
                                           "operation":op,"payload":payload})
