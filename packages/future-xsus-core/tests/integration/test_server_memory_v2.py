import unittest
import tempfile
import hashlib
from pathlib import Path
from aiohttp.test_utils import TestClient, TestServer
from services.api.server import create_local_app
from core.intelligence.persistent_memory_v2 import PersistentMemory
from core.intelligence.knowledge_v1 import KnowledgeStore, KnowledgeRecord, Evidence
from core.intelligence.knowledge_acquisition_v2 import KnowledgeAcquisition

class ServerMemoryV2Tests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        tmp=tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.db=Path(tmp.name)/"sessions.sqlite3"
        self.token="a"*40
        self.endpoint="/v2/intelligence/respond"
    async def client(self,enabled):
        app=create_local_app(self.db,owner="alice",token=self.token,intelligence_v2_enabled=enabled)
        c=TestClient(TestServer(app))
        await c.start_server()
        self.addAsyncCleanup(c.close)
        return c
    async def infer(self,c):
        return await c.post(self.endpoint,json={"contractVersion":"2.0.0","requestId":"req","text":"infer a from my knowledge","facts":[],"rules":[]},headers={"Authorization":"Bearer "+self.token})
    async def test_default_off(self):
        c=await self.client(False)
        self.assertEqual((await self.infer(c)).status,404)
        self.assertFalse(self.db.with_name("sessions.intelligence-v2.sqlite3").exists())
    async def test_persistent_reopen(self):
        c=await self.client(True)
        r=await self.infer(c)
        self.assertEqual((await r.json())["status"],"abstained")
        owner="u_"+hashlib.sha256(b"alice").hexdigest()[:62]
        memory=PersistentMemory(str(self.db.with_name("sessions.intelligence-v2.sqlite3")))
        p=KnowledgeAcquisition(KnowledgeStore()).propose(owner,KnowledgeRecord("a","true",Evidence.from_excerpt("source","a"),owner))
        memory.commit_reviewed(owner,p,expected_revision=0,reviewer="reviewer",approved=True)
        reopened=await self.client(True)
        r=await self.infer(reopened)
        self.assertEqual(r.status,200)
        self.assertEqual(((await r.json())["status"],(await self.infer(reopened)).status),("resolved",200))
    async def test_invalid_flag(self):
        with self.assertRaises(ValueError):
            create_local_app(self.db,owner="alice",token=self.token,intelligence_v2_enabled="true")
    async def test_no_auth(self):
        c=await self.client(True)
        r=await c.post(self.endpoint,json={"contractVersion":"2.0.0","requestId":"req","text":"prove a","facts":["a"],"rules":[]})
        self.assertEqual(r.status,401)
    async def test_v1_remains_off(self):
        c=await self.client(True)
        r=await c.post("/v1/intelligence/reason",json={},headers={"Authorization":"Bearer "+self.token})
        self.assertEqual(r.status,404)
