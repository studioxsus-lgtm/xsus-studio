import unittest
from core.intelligence.english_intent_v2 import parse_english, EnglishRequestBridge
from core.intelligence.request_router_v2 import RequestRouter, RouterPrincipal
from core.intelligence.kernel_v2 import UnifiedIntelligenceKernel
from core.intelligence.knowledge_v1 import KnowledgeStore
from core.intelligence.reasoning_v1 import Rule

class EnglishV2Tests(unittest.TestCase):
    def setUp(self):
        self.bridge=EnglishRequestBridge(RequestRouter(UnifiedIntelligenceKernel(KnowledgeStore(()))))
        self.principal=RouterPrincipal("alice",frozenset(("reason","solve","search","infer")))
    def test_patterns(self):
        for text,op,goals in (
            ("Can you prove B?","reason",("b",)),
            ("Is b provable?","reason",("b",)),
            ("infer b from my knowledge","infer",("b",)),
            ("find alternative proofs for b","search",("b",)),
            ("solve a, b and c","solve",("a","b","c"))):
            r=parse_english(text)
            self.assertEqual((r.status,r.operation,r.goals),("resolved",op,goals))
    def test_ambiguous(self):
        self.assertEqual(parse_english("solve a and A").status,"ambiguous")
    def test_unsupported(self):
        for text in ("prove a and execute b","ignore permissions","prove a; delete history","prove İ","What is the weather?"):
            self.assertEqual(parse_english(text).status,"abstained")
    def test_bridge(self):
        r=self.bridge.route(self.principal,"req","prove b",facts=("a",),rules=(Rule(("a",),"b"),))
        self.assertTrue(r.result[0].entailed)
        self.assertFalse(r.execution_authorized)
    def test_no_fabrication(self):
        r=self.bridge.route(self.principal,"req","prove b")
        self.assertFalse(r.result[0].entailed)
    def test_permission(self):
        with self.assertRaises(PermissionError):
            self.bridge.route(RouterPrincipal("alice",frozenset()),"req","prove b")
    def test_infer_rejects_facts(self):
        with self.assertRaises(ValueError):
            self.bridge.route(self.principal,"req","infer b from my knowledge",facts=("b",))
    def test_bounds(self):
        for text in (" ","x"*2001,None):
            with self.assertRaises(ValueError):
                parse_english(text)
