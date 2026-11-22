import unittest
from threading import Event, Thread
from core.intelligence.authorized_gateway_v1 import (
    AuthorizedIntelligenceGateway, IntelligencePrincipal)
from core.intelligence.unified_pipeline_v1 import PipelineRequest


class GatewayTests(unittest.TestCase):
    def setUp(self):
        self.principal = IntelligencePrincipal("alice", frozenset(("reason",)))
        self.request = PipelineRequest("r1", "reason",
                                       {"query": "a", "facts": ("a",), "rules": ()})
        self.gateway = AuthorizedIntelligenceGateway()

    def test_allowed(self):
        self.assertEqual(self.gateway.run(self.principal, self.request).status, "resolved")

    def test_missing_principal(self):
        with self.assertRaises(PermissionError):
            self.gateway.run(None, self.request)

    def test_untrusted_mapping(self):
        with self.assertRaises(PermissionError):
            self.gateway.run({"owner_id": "alice"}, self.request)

    def test_no_permission(self):
        with self.assertRaises(PermissionError):
            self.gateway.run(IntelligencePrincipal("alice", frozenset()), self.request)

    def test_owner_payload_rejected(self):
        request = PipelineRequest("r2", "reason", dict(self.request.payload, owner_id="bob"))
        with self.assertRaises(ValueError):
            self.gateway.run(self.principal, request)

    def test_knowledge_boundary(self):
        with self.assertRaises(PermissionError):
            self.gateway.run(self.principal, PipelineRequest("r3", "infer_from_sources", {}))

    def test_invalid_capacity(self):
        for capacity in (0, 33, True):
            with self.assertRaises(ValueError):
                AuthorizedIntelligenceGateway(capacity=capacity)

    def test_slot_released_after_failure(self):
        gateway = AuthorizedIntelligenceGateway(capacity=1)
        with self.assertRaises(ValueError):
            gateway.run(self.principal, PipelineRequest("r4", "reason", {}))
        self.assertEqual(gateway.run(self.principal, self.request).status, "resolved")

    def test_concurrent_capacity(self):
        started, release = Event(), Event()
        request, principal = self.request, self.principal
        results = []
        class BlockingPipeline:
            def run(self, req):
                started.set()
                if not release.wait(5):
                    raise RuntimeError("test timeout")
                return req.request_id
        gateway = AuthorizedIntelligenceGateway(BlockingPipeline(), capacity=1)
        worker = Thread(target=lambda: results.append(gateway.run(principal, request)))
        worker.start()
        try:
            self.assertTrue(started.wait(5))
            with self.assertRaisesRegex(RuntimeError, "capacity"):
                gateway.run(principal, request)
        finally:
            release.set()
            worker.join(6)
        self.assertFalse(worker.is_alive())
        self.assertEqual(results, ["r1"])
        self.assertEqual(gateway.run(principal, request), "r1")
