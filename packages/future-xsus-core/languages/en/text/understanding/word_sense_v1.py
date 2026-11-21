"""Conservative English word-sense disambiguation with explicit evidence.

This is a bounded lexical classifier, not a neural language-understanding claim.
Unsupported or ambiguous cases abstain. No network, training or persistence.
"""
from dataclasses import dataclass
import re

_WORD = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?")
_MAX_CHARS = 10000
# Evidence is intentionally small and auditable. A cue must occur near the
# target; unrelated words elsewhere in the document are not evidence.
_SENSES = {
    "bank": {
        "financial_institution": ("money", "account", "deposit", "loan", "cash", "savings", "credit", "withdraw"),
        "river_edge": ("river", "stream", "water", "shore", "flood", "fishing", "creek"),
    },
    "bat": {
        "animal": ("cave", "wings", "flying", "nocturnal", "mammal", "echolocation"),
        "sports_equipment": ("baseball", "cricket", "ball", "swing", "hitter", "pitch"),
    },
    "crane": {
        "bird": ("bird", "feathers", "nest", "wetland", "migrate"),
        "lifting_machine": ("construction", "lift", "steel", "building", "operator", "hoist"),
    },
    "seal": {
        "animal": ("ocean", "flippers", "marine", "swim", "fish"),
        "closure": ("envelope", "airtight", "package", "wax", "container"),
    },
    "spring": {
        "season": ("winter", "summer", "flowers", "season", "blossom"),
        "mechanical_coil": ("coil", "compress", "metal", "mattress", "mechanism"),
        "water_source": ("water", "natural", "stream", "source", "mountain"),
    },
    "mouse": {
        "animal": ("rodent", "cheese", "burrow", "whiskers", "tail"),
        "computer_device": ("computer", "cursor", "click", "keyboard", "usb", "screen"),
    },
    "java": {
        "programming_language": ("programming", "code", "compiler", "class", "developer", "software"),
        "coffee": ("coffee", "caffeine", "espresso", "brew", "cup", "roast"),
    },
    "port": {
        "harbor": ("ship", "harbor", "dock", "cargo", "vessel", "sail"),
        "network_endpoint": ("network", "tcp", "server", "socket", "firewall", "connection"),
    },
    "pitch": {
        "sports_field": ("soccer", "football", "grass", "stadium", "match"),
        "sound_frequency": ("sound", "frequency", "tone", "music", "note", "high"),
        "sales_presentation": ("investor", "startup", "presentation", "proposal", "client"),
    },
    "draft": {
        "preliminary_document": ("document", "edit", "revision", "manuscript", "proposal"),
        "air_current": ("window", "cold", "breeze", "wind", "door"),
    },
    "scale": {
        "measurement_device": ("weigh", "weight", "kilogram", "measurement", "balance"),
        "relative_size": ("size", "ratio", "map", "proportion", "dimension"),
        "musical_sequence": ("music", "notes", "piano", "melody", "octave"),
    },
    "jam": {
        "fruit_preserve": ("fruit", "toast", "strawberry", "jar", "spread"),
        "traffic_congestion": ("traffic", "cars", "highway", "road", "commute"),
        "music_session": ("guitar", "band", "musicians", "improvise", "drums"),
    },
    "file": {
        "digital_document": ("computer", "folder", "upload", "download", "document", "format"),
        "hand_tool": ("metal", "nails", "smooth", "tool", "surface", "wood"),
    },
    "python": {
        "programming_language": ("code", "script", "programming", "developer", "package", "function"),
        "snake": ("snake", "reptile", "jungle", "constrictor", "scales"),
    },
}

@dataclass(frozen=True, slots=True)
class WordSenseResult:
    target: str
    sense: str | None
    status: str
    confidence: str
    evidence: tuple[str, ...]
    candidates: tuple[str, ...]

def supported_words() -> tuple[str, ...]:
    return tuple(sorted(_SENSES))

def analyze_word_sense(text: str, target: str, *, window: int = 6) -> WordSenseResult:
    """Choose a sense only with an unambiguous, local lexical cue.

    Returns 'unknown' for unsupported targets, 'insufficient_evidence' without
    local cues, and 'ambiguous' for equal-strength conflicting senses.
    """
    if not isinstance(text, str) or not text.strip() or len(text) > _MAX_CHARS:
        raise ValueError("text must contain 1 to 10000 characters")
    if not isinstance(target, str) or not _WORD.fullmatch(target):
        raise ValueError("target must be a single English word")
    if type(window) is not int or not 1 <= window <= 20:
        raise ValueError("window must be an integer between 1 and 20")
    target = target.casefold()
    senses = _SENSES.get(target)
    if senses is None:
        return WordSenseResult(target, None, "unknown", "none", (), ())
    tokens = [m.group().casefold() for m in _WORD.finditer(text)]
    positions = [i for i, token in enumerate(tokens) if token == target]
    candidates = tuple(sorted(senses))
    if not positions:
        return WordSenseResult(target, None, "target_absent", "none", (), candidates)
    # Multiple mentions may refer to different senses; never silently merge
    # conflicting interpretations from separate occurrences.
    per_mention = []
    for i in positions:
        neighbors = tokens[max(0, i-window):i] + tokens[i+1:i+window+1]
        counts = {sense: len(set(neighbors) & set(cues)) for sense, cues in senses.items()}
        best = max(counts.values())
        winners = [sense for sense, score in counts.items() if score == best] if best else []
        per_mention.append((winners[0] if len(winners) == 1 else None, best, counts, neighbors))
    if any(score == 0 for _, score, _, _ in per_mention):
        return WordSenseResult(target, None, "insufficient_evidence", "none", (), candidates)
    if any(sense is None for sense, _, _, _ in per_mention) or len({sense for sense, _, _, _ in per_mention}) != 1:
        return WordSenseResult(target, None, "ambiguous", "none", (), candidates)
    chosen = per_mention[0][0]
    evidence = tuple(sorted({word for _, _, _, neighbors in per_mention for word in neighbors if word in senses[chosen]}))
    confidence = "medium" if len(evidence) >= 2 else "low"
    return WordSenseResult(target, chosen, "resolved", confidence, evidence, candidates)
