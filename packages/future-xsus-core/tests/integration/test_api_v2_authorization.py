import unittest
import tempfile
import hashlib
from pathlib import Path
from aiohttp.test_utils import TestClient, TestServer
from services.api.app import create_app
from core.intelligence.runtime_v2 import IntelligenceRuntime
from core.intelligence.persistent_memory_v2 import PersistentMemory
from core.intelligence.xsus_app_adapter_v2 import XSUSAppIntelligenceAdapterV2
from core.intelligence.knowledge_v1 import KnowledgeStore, KnowledgeRecord, Evidence
from core.intelligence.knowledge_acquisition_v2 import KnowledgeAcquisition

class AuthorizationTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        tmp=tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.memory=PersistentMemory(str(Path(tmp.name)/"memory.db"))
        self.adapter=XSUSAppIntelligenceAdapterV2(IntelligenceRuntime(self.memory),enabled=True)
    async def client(self,policy):
        app=create_app(store=None,conversation=None,owner_tokens={"alice":"token-a","bob":"token-b"},intelligence_v2_adapter=self.adapter,intelligence_v2_permissions=policy)
        c=TestClient(TestServer(app))
        await c.start_server()
        self.addAsyncCleanup(c.close)
        return c
    async def ask(self,c,token,text="prove a",facts=None,**extra):
        return await c.post("/v2/intelligence/respond",headers={"Authorization":"Bearer "+token},json=dict({"contractVersion":"2.0.0","requestId":"req","text":text,"facts":facts if facts is not None else ["a"],"rules":[]},**extra))
    async def test_allowlist(self):
        c=await self.client({"alice":frozenset(("reason",))})
        self.assertEqual((await self.ask(c,"token-a")).status,200)
        self.assertEqual((await self.ask(c,"token-b")).status,403)
        self.assertEqual((await self.ask(c,"token-a","solve a")).status,403)
    async def test_policy_copy(self):
        policy={"alice":frozenset(("reason",))}
        c=await self.client(policy)
        policy["bob"]=frozenset(("reason",))
        self.assertEqual((await self.ask(c,"token-b")).status,403)
    async def test_identity_isolation(self):
        owner="u_"+hashlib.sha256(b"alice").hexdigest()[:62]
        p=KnowledgeAcquisition(KnowledgeStore()).propose(owner,KnowledgeRecord("a","true",Evidence.from_excerpt("source","a"),owner))
        self.memory.commit_reviewed(owner,p,expected_revision=0,reviewer="reviewer",approved=True)
        c=await self.client({u:frozenset(("infer",)) for u in ("alice","bob")})
        a=await self.ask(c,"token-a","infer a from my knowledge",[])
        b=await self.ask(c,"token-b","infer a from my knowledge",[])
        self.assertEqual((await a.json())["status"],"resolved")
        self.assertEqual((await b.json())["status"],"abstained")
    async def test_spoofing(self):
        c=await self.client({"alice":frozenset(("reason",))})
        self.assertEqual((await self.ask(c,"token-a",ownerId="bob")).status,400)
        self.assertEqual((await self.ask(c,"fake")).status,401)
    async def test_empty_policy(self):
        c=await self.client({})
        self.assertEqual((await self.ask(c,"token-a")).status,403)
    async def test_invalid_policy(self):
        for policy in ({"alice":frozenset(("coordinate",))},{"alice":["reason"]}):
            with self.assertRaises(ValueError):
                create_app(store=None,conversation=None,owner_tokens={"alice":"token-a"},intelligence_v2_adapter=self.adapter,intelligence_v2_permissions=policy)
