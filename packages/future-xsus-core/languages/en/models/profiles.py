"""Resolve the bundled English models and verify their declared revisions."""

import tomllib
from pathlib import Path

from .checkpoint import load_checkpoint

_MANIFESTS = {
    "seed-v1": "text.toml",
    "rewrite-v2": "rewrite-v2.toml",
    "conversation-v3": "conversation-v3.toml",
    "written-v4": "written-v4.toml",
}
_LANGUAGE_ROOT = Path(__file__).resolve().parents[1]


def load_profile(name: str):
    """Load a bundled checkpoint and check the digest of the bytes used by the model."""
    if name not in _MANIFESTS:
        choices = ", ".join(_MANIFESTS)
        raise ValueError(f"Unknown XSUS English profile {name!r}. Choose from: {choices}")
    manifest_path = _LANGUAGE_ROOT / "models" / "manifests" / _MANIFESTS[name]
    with manifest_path.open("rb") as source:
        manifest = tomllib.load(source)
    tokenizer, model, revision = load_checkpoint(_LANGUAGE_ROOT / manifest["checkpoint"])
    if revision != "sha256-" + manifest["sha256"]:
        raise ValueError(f"Checkpoint checksum does not match the XSUS English profile {name!r}")
    return tokenizer, model, revision
