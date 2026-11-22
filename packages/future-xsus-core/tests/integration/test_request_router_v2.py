import unittest
from unittest.mock import patch
from core.intelligence.request_router_v2 import RequestRouter, RouterPrincipal
from core.intelligence.kernel_v2 import UnifiedIntelligenceKernel
from core.intelligence.knowledge_v1 import KnowledgeStore, KnowledgeRecord, Evidence
from core.intelligence.reasoning_v1 import Rule

class RouterTests(unittest.TestCase):
    def setUp(self):
        self.kernel=UnifiedIntelligenceKernel(KnowledgeStore((KnowledgeRecord("a","true",Evidence.from_excerpt("source","a"),"alice"),)))
        self.router=RequestRouter(self.kernel,capacity=1)
        self.principal=RouterPrincipal("alice",frozenset(("infer",)))
        self.request=dict(version="2.0.0",request_id="request_1",operation="infer",payload=dict(query="b",rules=(Rule(("a",),"b"),)))
    def route(self):
        return self.router.route(self.principal,self.request)
    def test_dispatch(self):
        r=self.route()
        self.assertEqual(r.result.status,"supported")
        self.assertFalse(r.execution_authorized)
    def test_owner_isolation(self):
        r=self.router.route(RouterPrincipal("bob",frozenset(("infer",))),self.request)
        self.assertEqual(r.result.status,"unknown")
    def test_permission(self):
        for p in (None,{},RouterPrincipal("alice",frozenset())):
            with self.assertRaises(PermissionError):
                self.router.route(p,self.request)
    def test_invalid_envelope(self):
        for extra in ({"owner_id":"bob"},{"version":"1.0.0"},{"payload":[]},{"request_id":"INVALID"}):
            with self.assertRaises(ValueError):
                self.router.route(self.principal,{**self.request,**extra})
    def test_no_operation_escalation(self):
        for op in ("execute","evaluate_candidate",[]):
            with self.assertRaises(PermissionError):
                self.router.route(self.principal,{**self.request,"operation":op})
    def test_capacity_and_recovery(self):
        with patch.object(self.kernel,"run",side_effect=lambda *a: self.route()):
            with self.assertRaisesRegex(RuntimeError,"capacity"):
                self.route()
        self.assertEqual(self.route().result.status,"supported")
    def test_invalid_payload_recovery(self):
        with self.assertRaises(ValueError):
            self.router.route(self.principal,{**self.request,"payload":{}})
        self.assertEqual(self.route().result.status,"supported")
    def test_bounds(self):
        for capacity in (True,0,33):
            with self.assertRaises(ValueError):
                RequestRouter(self.kernel,capacity=capacity)
        with self.assertRaises(ValueError):
            RouterPrincipal("alice",frozenset(("execute",)))
