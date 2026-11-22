import unittest
import tempfile
import json
from pathlib import Path
from core.intelligence.xsus_app_adapter_v2 import XSUSAppIntelligenceAdapterV2
from core.intelligence.runtime_v2 import IntelligenceRuntime
from core.intelligence.persistent_memory_v2 import PersistentMemory
from core.intelligence.request_router_v2 import RouterPrincipal

class AdapterTests(unittest.TestCase):
    def setUp(self):
        tmp=tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.runtime=IntelligenceRuntime(PersistentMemory(str(Path(tmp.name)/"memory.db")))
        self.adapter=XSUSAppIntelligenceAdapterV2(self.runtime,enabled=True)
        self.principal=RouterPrincipal("alice",frozenset(("reason","solve","infer","search")))
        self.envelope={"contractVersion":"2.0.0","requestId":"req","text":"prove b","facts":["a"],"rules":[{"premises":["a"],"conclusion":"b"}]}
    def test_roundtrip(self):
        r=json.loads(json.dumps(self.adapter.respond(self.principal,self.envelope)))
        self.assertEqual((r["status"],r["requestId"],r["contractVersion"]),("resolved","req","2.0.0"))
        self.assertFalse(r["executionAuthorized"] or r["externalTruthVerified"])
        self.assertEqual(r["memoryRevision"],0)
    def test_disabled(self):
        with self.assertRaises(PermissionError):
            XSUSAppIntelligenceAdapterV2(self.runtime).respond(self.principal,self.envelope)
    def test_permission(self):
        for p in (None,RouterPrincipal("alice",frozenset())):
            with self.assertRaises(PermissionError):
                self.adapter.respond(p,self.envelope)
    def test_envelope(self):
        for patch in ({"ownerId":"bob"},{"permissions":["reason"]},{"contractVersion":"1.0.0"},{"requestId":"INVALID"}):
            with self.assertRaises(ValueError):
                self.adapter.respond(self.principal,dict(self.envelope,**patch))
    def test_context(self):
        for patch in ({"facts":["INVALID"]},{"facts":["a"]*257},{"rules":[{"premises":[],"conclusion":"b"}]},{"rules":[{"premises":["a"],"conclusion":"b","extra":1}]}):
            with self.assertRaises(ValueError):
                self.adapter.respond(self.principal,dict(self.envelope,**patch))
    def test_unknown(self):
        r=self.adapter.respond(self.principal,dict(self.envelope,text="What is everything?"))
        self.assertEqual((r["status"],r["operation"]),("abstained","unrecognized"))
    def test_partial(self):
        r=self.adapter.respond(self.principal,dict(self.envelope,text="solve b and c"))
        self.assertEqual(r["status"],"partial")
    def test_infer_context_boundary(self):
        with self.assertRaises(ValueError):
            self.adapter.respond(self.principal,dict(self.envelope,text="infer b from my knowledge"))
        r=self.adapter.respond(self.principal,dict(self.envelope,text="infer b from my knowledge",facts=[]))
        self.assertEqual(r["status"],"abstained")
