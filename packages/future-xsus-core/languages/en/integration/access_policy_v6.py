"""Local, stateless authorization policy for opt-in V6 diagnostics.

This policy accepts a caller identity already verified by a trusted upstream.
It does NOT authenticate credentials or provide a network rate limiter.
"""
from dataclasses import dataclass
from .adapter_v6 import CONTRACT

@dataclass(frozen=True, slots=True)
class DiagnosticPrincipal:
    subject: str
    scopes: frozenset[str]

def authorize_diagnostics_v6(principal: DiagnosticPrincipal, operation: str) -> bool:
    if not isinstance(principal, DiagnosticPrincipal):
        return False
    if not isinstance(principal.subject, str) or not 1 <= len(principal.subject) <= 128:
        return False
    if not isinstance(principal.scopes, frozenset) or not all(isinstance(x, str) for x in principal.scopes):
        return False
    if operation not in ("analyze", "batch"):
        return False
    return f"{CONTRACT}:{operation}" in principal.scopes
