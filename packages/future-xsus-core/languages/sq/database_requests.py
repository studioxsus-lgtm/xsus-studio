"""Bounded database requirements; no SQL execution or database access."""
from dataclasses import dataclass
import re
from .text import normalize

_TYPES = {"tekst": "text", "numër i plotë": "integer", "numër dhjetor": "decimal",
          "datë": "date", "boolean": "boolean", "uuid": "uuid"}
_OPERATIONS = {"krijim": "create", "lexim": "read", "përditësim": "update", "fshirje": "delete"}
_NAME = r"[a-z][a-z0-9_]{0,62}"

@dataclass(frozen=True, slots=True)
class DatabaseSpec:
    table: str
    columns: tuple[tuple[str, str], ...] = ()
    operations: tuple[str, ...] = ()
    related_table: str | None = None
    relationship: str | None = None
    execution_authorized: bool = False

def analyze_database(text: str) -> DatabaseSpec | None:
    if not isinstance(text, str):
        raise TypeError("Expected text")
    if len(text) > 4096:
        return None
    value = " ".join(normalize(text).split()).removesuffix(".")
    match = re.fullmatch(rf"krijo tabelën ({_NAME}) me kolonat (.+)", value)
    if match:
        columns = []
        parts = re.split(r"\s*,\s*|\s+dhe\s+", match[2])
        if len(parts) > 32:
            return None
        for part in parts:
            field = re.fullmatch(rf"({_NAME})\s*:\s*(.+)", part)
            if not field or field[2] not in _TYPES or any(name == field[1] for name, _ in columns):
                return None
            columns.append((field[1], _TYPES[field[2]]))
        return DatabaseSpec(match[1], tuple(columns))
    match = re.fullmatch(rf"shto operacionet (.+) për tabelën ({_NAME})", value)
    if match:
        parts = re.split(r"\s*,\s*|\s+dhe\s+", match[1])
        if len(parts) > 4 or any(part not in _OPERATIONS for part in parts):
            return None
        return DatabaseSpec(match[2], operations=tuple(dict.fromkeys(_OPERATIONS[p] for p in parts)))
    match = re.fullmatch(rf"lidh tabelën ({_NAME}) me tabelën ({_NAME}) (një me një|një me shumë|shumë me shumë)", value)
    if match:
        kind = {"një me një": "one_to_one", "një me shumë": "one_to_many", "shumë me shumë": "many_to_many"}
        return DatabaseSpec(match[1], related_table=match[2], relationship=kind[match[3]])
    return None
