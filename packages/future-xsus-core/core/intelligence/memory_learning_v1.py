"""Read existing session history and propose review-gated learning corrections.

The adapter never modifies session history, checkpoint weights, or trusted facts.
"""
from dataclasses import dataclass
from core.contracts.request import ConversationRole
from core.sessions.session_store import SessionNotFoundError
from .learning_v1 import LearningLedger, LearningProposal


@dataclass(frozen=True, slots=True)
class MemoryContext:
    session_id: str
    revision: int
    turns: tuple[tuple[str, str], ...]
    limitations: tuple[str, ...]


class MemoryLearningBridge:
    def __init__(self, session_store, learning_ledger: LearningLedger):
        if not isinstance(learning_ledger, LearningLedger):
            raise ValueError("invalid learning ledger")
        if not callable(getattr(session_store, "get", None)):
            raise ValueError("session store must support owner-scoped get")
        self._sessions = session_store
        self._learning = learning_ledger

    def context(self, owner_id: str, session_id: str, *, max_turns: int = 16) -> MemoryContext:
        if type(max_turns) is not int or not 1 <= max_turns <= 32:
            raise ValueError("max_turns must be between 1 and 32")
        snapshot = self._sessions.get(owner_id, session_id)
        turns = tuple((turn.role.value, turn.text) for turn in snapshot.history[-max_turns:])
        return MemoryContext(snapshot.session_id, snapshot.revision, turns,
                             ("history_is_not_verified_knowledge",))

    def propose_from_correction(self, owner_id: str, session_id: str,
                                correction: str, *, expected_revision: int) -> LearningProposal:
        if type(expected_revision) is not int or expected_revision < 0:
            raise ValueError("invalid revision")
        snapshot = self._sessions.get(owner_id, session_id)
        if snapshot.revision != expected_revision:
            raise ValueError("stale session revision")
        if not snapshot.history or snapshot.history[-1].role != ConversationRole.ASSISTANT:
            raise ValueError("no assistant answer to correct")
        observation = snapshot.history[-1].text
        return self._learning.propose(owner_id, observation, correction,
                                      "session_" + snapshot.session_id)
