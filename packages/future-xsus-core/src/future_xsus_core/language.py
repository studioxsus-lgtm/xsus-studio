"""Load each language profile from its own directory."""

import re
import tomllib
from dataclasses import dataclass
from pathlib import Path

_LANGUAGE_TAG = re.compile(r"[a-z]{2,8}")
_CAPABILITIES = ("text", "recognition", "synthesis")
_STATES = ("planned", "in-development", "verified")


@dataclass(frozen=True, slots=True)
class LanguageProfile:
    tag: str
    name: str
    stage: str
    text: str
    recognition: str
    synthesis: str


def _load_profile(path: Path) -> LanguageProfile:
    try:
        with path.open("rb") as manifest:
            data = tomllib.load(manifest)
    except (tomllib.TOMLDecodeError, UnicodeError) as error:
        raise ValueError(f"Invalid language manifest: {path}") from error

    tag = path.parent.name
    name = data.get("name")
    stage = data.get("stage")
    capabilities = data.get("capabilities")
    if not _LANGUAGE_TAG.fullmatch(tag) or data.get("tag") != tag:
        raise ValueError(f"Language tag must match its directory: {path}")
    if not isinstance(name, str) or not name.strip() or stage not in ("baseline", "planned"):
        raise ValueError(f"Invalid language name or stage: {path}")
    if not isinstance(capabilities, dict) or set(capabilities) != set(_CAPABILITIES):
        raise ValueError(f"Invalid language capabilities: {path}")
    if any(capabilities[key] not in _STATES for key in _CAPABILITIES):
        raise ValueError(f"Invalid language capability status: {path}")
    return LanguageProfile(tag=tag, name=name, stage=stage, **capabilities)


class LanguageRegistry:
    def __init__(self, directory: Path) -> None:
        self._directory = Path(directory).resolve()
        if not self._directory.is_dir():
            raise FileNotFoundError(f"Language pack directory not found: {self._directory}")
        profiles = tuple(
            _load_profile(path)
            for path in sorted(self._directory.glob("*/language.toml"))
        )
        baselines = [profile for profile in profiles if profile.stage == "baseline"]
        if len(baselines) != 1:
            raise ValueError("The language catalog must have exactly one baseline")
        self._baseline = baselines[0]
        self._profiles = {profile.tag: profile for profile in profiles}

    def resolve(self, tag: str | None = None) -> LanguageProfile:
        if tag is None:
            return self._baseline
        normalized = tag.strip().lower()
        if normalized not in self._profiles:
            raise ValueError(f"Unknown language: {tag!r}")
        return self._profiles[normalized]

    def text_instructions(self, tag: str | None = None) -> tuple[LanguageProfile, str]:
        profile = self.resolve(tag)
        if profile.text == "planned":
            raise ValueError(f"Text conversation is planned for {profile.name} ({profile.tag})")
        path = self._directory / profile.tag / "text" / "response-style.md"
        instructions = path.read_text(encoding="utf-8").strip()
        if not instructions:
            raise ValueError(f"Empty language instructions: {path}")
        return profile, instructions
