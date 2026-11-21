"""Bounded owner-scoped conversational routing over explicit symbolic requests.

This is not a natural-language understanding or text generation model.
"""
from dataclasses import dataclass
from .reasoning_v1 import Rule
from .english_intent_v1 import parse_english_intent
from .kernel_v1 import IntelligenceKernel
from ..sessions.session_store import InMemorySessionStore


@dataclass(frozen=True, slots=True)
class ConversationReply:
    status: str
    answer: str | None
    session_id: str
    revision: int
    limitations: tuple[str, ...]


class ConversationRouter:
    def __init__(self, store=None, kernel=None):
        self.store = store if store is not None else InMemorySessionStore()
        self.kernel = kernel if kernel is not None else IntelligenceKernel()

    def create(self, owner_id: str):
        return self.store.create(owner_id)

    def reply(self, owner_id: str, session_id: str, *, expected_revision: int,
              text: str, facts: tuple[str, ...] = (),
              rules: tuple[Rule, ...] = ()) -> ConversationReply:
        snapshot = self.store.get(owner_id, session_id)
        if snapshot.revision != expected_revision:
            raise ValueError("stale conversation revision")
        if not isinstance(text, str) or not 1 <= len(text.strip()) <= 2000:
            raise ValueError("invalid conversation input")
        if not isinstance(facts, tuple) or not isinstance(rules, tuple):
            raise ValueError("invalid symbolic context")
        normalized = text.strip()
        intent = parse_english_intent(normalized)
        if intent.kind == "prove":
            result = self.kernel.reason(intent.atom, facts, rules)
            status = result.status
            answer = result.answer if result.status == "resolved" else None
            limitations = result.limitations + intent.limitations
        elif intent.kind == "history":
            status = "resolved"
            answer = "exchanges:" + str(len(snapshot.history) // 2)
            limitations = ("metadata_only",)
        else:
            status, answer = "abstained", None
            limitations = intent.limitations
        # Store a minimal status rather than echoing potentially sensitive
        # evidence or fabricated conversational explanations.
        updated = self.store.append_exchange(
            owner_id, session_id, expected_revision=expected_revision,
            user_text=normalized, assistant_text=status + ":" + (answer or "none"))
        return ConversationReply(status, answer, session_id, updated.revision,
                                 limitations + ("bounded_english_intent_grammar",
                                                "no_autonomous_learning"))
