"""Explicit security requirements, not enforcement or authorization."""
from dataclasses import dataclass
import re
from .text import normalize

_CONTROLS = {
    "autentikim": "authentication",
    "autentikim me dy faktorë": "mfa",
    "autorizim": "authorization",
    "kontroll të roleve": "role_based_access",
    "kontroll të lejeve": "permission_checks",
    "kriptim të të dhënave": "encryption_at_rest",
    "kriptim gjatë transmetimit": "encryption_in_transit",
    "izolim të të dhënave": "data_isolation",
    "mbrojtje të privatësisë": "privacy",
    "regjistrim të auditimit": "audit_logging",
    "skadim të sesioneve": "session_expiration",
    "kufizim të kërkesave": "rate_limiting",
}
_DEPENDENCIES = {
    "mfa": ("authentication",),
    "role_based_access": ("authentication", "authorization"),
    "permission_checks": ("authorization",),
    "session_expiration": ("authentication",),
}

@dataclass(frozen=True, slots=True)
class SecuritySpec:
    requested: tuple[str, ...]
    suggested_controls: tuple[str, ...]
    execution_authorized: bool = False

def analyze_security(text: str) -> SecuritySpec | None:
    if not isinstance(text, str):
        raise TypeError("Expected text")
    if len(text) > 4096:
        return None
    value = " ".join(normalize(text).split()).removesuffix(".")
    match = re.fullmatch(r"(?:shto|konfiguro) (?:sigurinë|mbrojtjen) me (.+)", value)
    if not match:
        return None
    parts = re.split(r"\s*,\s*|\s+dhe\s+", match[1])
    if len(parts) > 16 or any(part not in _CONTROLS for part in parts):
        return None
    requested = tuple(dict.fromkeys(_CONTROLS[part] for part in parts))
    suggested = tuple(dict.fromkeys(dep for control in requested
                      for dep in _DEPENDENCIES.get(control, ())
                      if dep not in requested))
    return SecuritySpec(requested, suggested)
