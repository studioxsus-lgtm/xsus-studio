"""Independent technical terminology registry; recognition is not authorization."""
from dataclasses import dataclass
from types import MappingProxyType
from .text import normalize

@dataclass(frozen=True, slots=True)
class TechnicalTerm:
    category: str
    concept: str

_ROWS = (
    ("ndërfaqe", "interface", "interface"),
    ("buton", "interface", "button"),
    ("formular", "interface", "form"),
    ("menu", "interface", "menu"),
    ("shirit navigimi", "interface", "navigation_bar"),
    ("panel", "interface", "panel"),
    ("tabelë", "interface", "table"),
    ("listë", "interface", "list"),
    ("kartë", "interface", "card"),
    ("dritare modale", "interface", "modal"),
    ("dizajn", "design", "design"),
    ("ngjyrë", "design", "color"),
    ("tipografi", "design", "typography"),
    ("temë e errët", "design", "dark_theme"),
    ("temë e çelët", "design", "light_theme"),
    ("animacion", "design", "animation"),
    ("paraqitje", "design", "layout"),
    ("ikonë", "design", "icon"),
    ("databazë", "data", "database"),
    ("bazë të dhënash", "data", "database"),
    ("rekord", "data", "record"),
    ("kolonë", "data", "column"),
    ("indeks", "data", "index"),
    ("migrim", "data", "migration"),
    ("kopje rezervë", "data", "backup"),
    ("ruajtje", "data", "storage"),
    ("autentikim", "security", "authentication"),
    ("autorizim", "security", "authorization"),
    ("fjalëkalim", "security", "password"),
    ("sesion", "security", "session"),
    ("kriptim", "security", "encryption"),
    ("leje", "security", "permission"),
    ("rol", "security", "role"),
    ("verifikim", "security", "verification"),
    ("pagesa", "features", "payments"),
    ("njoftime", "features", "notifications"),
    ("kërkim", "features", "search"),
    ("filtrim", "features", "filtering"),
    ("renditje", "features", "sorting"),
    ("menaxhim detyrash", "features", "task_management"),
    ("kalendar", "features", "calendar"),
    ("profil", "features", "profile"),
    ("raport", "features", "report"),
    ("eksport", "features", "export"),
    ("import", "features", "import"),
    ("android", "platform", "android"),
    ("ios", "platform", "ios"),
    ("web", "platform", "web"),
    ("desktop", "platform", "desktop"),
    ("kod burimor", "development", "source_code"),
    ("komponent", "development", "component"),
    ("modul", "development", "module"),
    ("test", "development", "test"),
    ("testim", "development", "testing"),
    ("ndërtim", "development", "build"),
    ("publikim", "development", "deployment"),
    ("version", "development", "version"),
    ("api", "development", "api"),
    ("server", "development", "server"),
    ("klient", "development", "client"),
    ("projekt", "development", "project"),
    ("aplikacion", "development", "application"),
)
TERMS = MappingProxyType({term: TechnicalTerm(category, concept)
                          for term, category, concept in _ROWS})

def lookup_technical_term(text: str) -> TechnicalTerm | None:
    if not isinstance(text, str):
        raise TypeError("Expected text")
    if len(text) > 256:
        return None
    return TERMS.get(" ".join(normalize(text).split()))
