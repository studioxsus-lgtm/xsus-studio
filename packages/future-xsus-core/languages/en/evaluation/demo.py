"""Send an English prompt through the normal Future XSUS Core local pipeline."""

import argparse
import asyncio
from time import time_ns
from uuid import uuid4

from core.contracts.common import V1
from core.contracts.errors import EngineError
from core.contracts.request import Conversation, ConversationRole, ConversationTurn, EngineRequest
from core.contracts.response import EngineResponse, TextResult
from core.execution.local_transport import LocalEngineTransport
from core.execution.request_executor import RequestExecutor
from core.registry.engine_registry import EngineRegistry
from core.registry.instance import InstanceStatus
from core.routing.metrics import RoutingMetrics
from core.routing.request_router import RequestRouter

from ..engine.english_engine import ENGLISH, create_engine


async def run(prompt: str, follow_up: str | None) -> int:
    engine = create_engine()
    registry = EngineRegistry()
    registry.register_engine(engine.descriptor)
    registry.register_instance(engine.instance, status=InstanceStatus.READY)
    executor = RequestExecutor(RequestRouter(registry, RoutingMetrics()), LocalEngineTransport((engine,)))
    history: tuple[ConversationTurn, ...] = ()
    for text in (prompt, follow_up):
        if text is None:
            break
        request = EngineRequest(
            uuid4().hex, uuid4().hex, V1, ENGLISH,
            time_ns() // 1_000_000 + 10_000, Conversation(text, history),
        )
        result = await executor.execute(request)
        outcome = result.outcome if isinstance(result, EngineResponse) else result
        if isinstance(outcome, EngineError):
            print(f"{outcome.code}: {outcome.message}")
            return 1
        if not isinstance(outcome, TextResult):
            raise RuntimeError("English conversation returned an unexpected result")
        print(outcome.text)
        history += (ConversationTurn(ConversationRole.USER, text), ConversationTurn(ConversationRole.ASSISTANT, outcome.text))
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("prompt")
    parser.add_argument("--follow-up")
    args = parser.parse_args()
    raise SystemExit(asyncio.run(run(args.prompt, args.follow_up)))


if __name__ == "__main__":
    main()
