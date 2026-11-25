import unittest
from aiohttp import web
from aiohttp.test_utils import AioHTTPTestCase
from services.api.logo_interpret import interpret_logo
from services.api.logo_endpoint import attach_logo_interpret

TOKEN = "t" * 64
def payload(prompt='Modern technology logo for "Nova" blue purple', language="en"):
    return {"version":"1.0.0","requestId":"test-1","operation":"logo.interpret","prompt":prompt,"language":language}

class LogoInterpretTests(unittest.TestCase):
    def test_english(self):
        b = interpret_logo(payload())["brief"]
        self.assertEqual((b["name"],b["industry"],b["style"],b["primary"],b["secondary"]),("Nova","technology","modern","#2563eb","#7c3aed"))
    def test_albanian(self):
        b = interpret_logo(payload('Logo moderne teknologjike për "Nova" blu vjollcë',"sq"))["brief"]
        self.assertEqual((b["industry"],b["primary"],b["secondary"]),("technology","#2563eb","#7c3aed"))
    def test_french(self):
        b = interpret_logo(payload('Logo classique pour «Nova» restaurant rouge blanc',"fr"))["brief"]
        self.assertEqual((b["name"],b["industry"],b["style"],b["primary"]),("Nova","food","classic","#dc2626"))
    def test_missing_name(self):
        self.assertTrue(interpret_logo(payload("Modern logo"))["clarification_required"])
    def test_invalid_language(self):
        with self.assertRaises(ValueError): interpret_logo(payload(language="xx"))
    def test_invalid_version(self):
        with self.assertRaises(ValueError): interpret_logo(dict(payload(),version="2"))
    def test_invalid_id(self):
        with self.assertRaises(ValueError): interpret_logo(dict(payload(),requestId="../bad"))
    def test_long_prompt(self):
        with self.assertRaises(ValueError): interpret_logo(payload("a"*4001))
    def test_blank_prompt(self):
        with self.assertRaises(ValueError): interpret_logo(payload(" "))
    def test_invalid_token_configuration(self):
        with self.assertRaises(ValueError): attach_logo_interpret(web.Application(),"short")

class LogoEndpointTests(AioHTTPTestCase):
    async def get_application(self):
        app = web.Application()
        attach_logo_interpret(app,TOKEN)
        return app
    async def post(self, **kwargs):
        return await self.client.post("/internal/logo/interpret",**kwargs)
    async def test_authorized(self):
        async with await self.post(json=payload(),headers={"Authorization":"Bearer "+TOKEN}) as r:
            self.assertEqual(r.status,200)
            self.assertEqual((await r.json())["requestId"],"test-1")
    async def test_missing_token(self):
        async with await self.post(json=payload()) as r: self.assertEqual(r.status,401)
    async def test_wrong_token(self):
        async with await self.post(json=payload(),headers={"Authorization":"Bearer wrong"}) as r: self.assertEqual(r.status,401)
    async def test_wrong_content_type(self):
        async with await self.post(data="hello",headers={"Authorization":"Bearer "+TOKEN}) as r: self.assertEqual(r.status,415)
    async def test_extra_field(self):
        async with await self.post(json=dict(payload(),executionAllowed=True),headers={"Authorization":"Bearer "+TOKEN}) as r: self.assertEqual(r.status,400)
    async def test_malformed_json(self):
        async with await self.post(data="{",headers={"Authorization":"Bearer "+TOKEN,"Content-Type":"application/json"}) as r: self.assertEqual(r.status,400)
    async def test_oversized_body(self):
        async with await self.post(json=payload("a"*33000),headers={"Authorization":"Bearer "+TOKEN}) as r: self.assertEqual(r.status,413)
