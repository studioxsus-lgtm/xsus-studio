import unittest
import tempfile
from pathlib import Path
from aiohttp.test_utils import TestClient, TestServer
from services.api.app import create_app
from core.intelligence.runtime_v2 import IntelligenceRuntime
from core.intelligence.persistent_memory_v2 import PersistentMemory
from core.intelligence.xsus_app_adapter_v2 import XSUSAppIntelligenceAdapterV2

class ApiV2Tests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        tmp=tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.adapter=XSUSAppIntelligenceAdapterV2(IntelligenceRuntime(PersistentMemory(str(Path(tmp.name)/"memory.db"))),enabled=True)
        self.path="/v2/intelligence/respond"
        self.headers={"Authorization":"Bearer token-a"}
        self.payload={"contractVersion":"2.0.0","requestId":"req","text":"prove a","facts":["a"],"rules":[]}
    async def client(self,enabled=True):
        app=create_app(store=None,conversation=None,owner_tokens={"alice":"token-a"},intelligence_v2_adapter=self.adapter if enabled else None)
        client=TestClient(TestServer(app))
        await client.start_server()
        self.addAsyncCleanup(client.close)
        return client
    async def test_disabled(self):
        c=await self.client(False)
        self.assertEqual((await c.post(self.path,json=self.payload,headers=self.headers)).status,404)
    async def test_authentication(self):
        c=await self.client()
        for headers in ({},{"Authorization":"Bearer fake"}):
            self.assertEqual((await c.post(self.path,json=self.payload,headers=headers)).status,401)
    async def test_response(self):
        c=await self.client()
        r=await c.post(self.path,json=self.payload,headers=self.headers)
        self.assertEqual(r.status,200)
        data=await r.json()
        self.assertEqual(data["status"],"resolved")
        self.assertFalse(data["executionAuthorized"])
        self.assertEqual(r.headers["Cache-Control"],"no-store")
    async def test_invalid(self):
        c=await self.client()
        for payload in (dict(self.payload,ownerId="bob"),dict(self.payload,contractVersion="1.0.0")):
            self.assertEqual((await c.post(self.path,json=payload,headers=self.headers)).status,400)
        r=await c.post(self.path,data='{"text":"a","text":"b"}',headers=dict(self.headers,**{"Content-Type":"application/json"}))
        self.assertEqual(r.status,400)
    async def test_media_and_origins(self):
        c=await self.client()
        self.assertEqual((await c.post(self.path,data="hello",headers=self.headers)).status,415)
        self.assertEqual((await c.post(self.path,json=self.payload,headers=dict(self.headers,Origin="https://untrusted.example"))).status,403)
    async def test_v1_unchanged(self):
        c=await self.client()
        self.assertEqual((await c.post("/v1/intelligence/reason",json={},headers=self.headers)).status,404)
