"""Independent, deterministic logo brief interpretation."""
import re
import unicodedata

COLORS = {
    "blue": "#2563eb", "blu": "#2563eb", "bleu": "#2563eb",
    "purple": "#7c3aed", "vjollcë": "#7c3aed", "violet": "#7c3aed",
    "red": "#dc2626", "kuqe": "#dc2626", "rouge": "#dc2626",
    "green": "#16a34a", "gjelbër": "#16a34a", "vert": "#16a34a",
    "black": "#111827", "zezë": "#111827", "noir": "#111827",
    "white": "#ffffff", "bardhë": "#ffffff", "blanc": "#ffffff",
    "gold": "#d4a017", "artë": "#d4a017", "doré": "#d4a017",
}
INDUSTRIES = {
    "technology": ("technology", "tech", "teknologji", "teknologjike", "technologie"),
    "food": ("food", "restaurant", "ushqim", "restorant", "cuisine"),
    "finance": ("finance", "bank", "financë", "banque"),
    "health": ("health", "medical", "shëndet", "santé"),
}
STYLES = {
    "minimal": ("minimal", "minimalist", "minimaliste"),
    "modern": ("modern", "moderne"),
    "classic": ("classic", "klasik", "classique"),
    "luxury": ("luxury", "luks", "luxe"),
}

def interpret_logo(request):
    if not isinstance(request, dict) or request.get("version") != "1.0.0" or request.get("operation") != "logo.interpret":
        raise ValueError("Invalid contract")
    rid, prompt, language = (request.get(k) for k in ("requestId", "prompt", "language"))
    if not isinstance(rid, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", rid):
        raise ValueError("Invalid request ID")
    if not isinstance(prompt, str) or not prompt.strip() or len(prompt) > 4000 or language not in ("en", "fr", "sq"):
        raise ValueError("Invalid prompt or language")
    prompt = unicodedata.normalize("NFC", prompt)
    words = set(re.findall(r"[^\W_]+", prompt.casefold()))
    colors = list(dict.fromkeys(COLORS[w] for w in re.findall(r"[^\W_]+", prompt.casefold()) if w in COLORS))
    name_match = re.search(r'["“«]([^"”»\n]{1,120})["”»]', prompt)
    name = name_match.group(1).strip() if name_match else ""
    industry = next((k for k,v in INDUSTRIES.items() if words.intersection(v)), "general")
    style = next((k for k,v in STYLES.items() if words.intersection(v)), "unspecified")
    return {"version":"1.0.0","requestId":rid,"brief":{"name":name,"industry":industry,"style":style,"primary":colors[0] if colors else None,"secondary":colors[1] if len(colors)>1 else None,"language":language},"clarification_required":not bool(name)}
