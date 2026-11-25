import unittest
from services.api.web_interpret import interpret_web, attach_web_interpret
from aiohttp import web

class WebInterpretTests(unittest.TestCase):
    def request(self):
        return dict(contractVersion="1.0.0", prompt=" Website ", name=" Example ", language="en", executionAllowed=False)

    def test_normalization(self):
        result = interpret_web(self.request())
        self.assertEqual(result["prompt"], "Website")
        self.assertEqual(result["status"], "ready")
        self.assertIs(result["executionAllowed"], False)

    def test_languages(self):
        for language in ("en", "sq", "fr"):
            self.assertEqual(interpret_web(dict(self.request(), language=language))["language"], language)

    def test_execution_rejected(self):
        with self.assertRaises(ValueError):
            interpret_web(dict(self.request(), executionAllowed=True))

    def test_invalid_version(self):
        with self.assertRaises(ValueError):
            interpret_web(dict(self.request(), contractVersion="2"))

    def test_empty_prompt(self):
        with self.assertRaises(ValueError):
            interpret_web(dict(self.request(), prompt=" "))

    def test_extra_fields(self):
        with self.assertRaises(ValueError):
            interpret_web(dict(self.request(), extra=True))

    def test_short_token(self):
        with self.assertRaises(ValueError):
            attach_web_interpret(web.Application(), "short")

    def test_route_registration(self):
        app = web.Application()
        attach_web_interpret(app, "a" * 32)
        self.assertTrue(any(r.method == "POST" and r.resource.canonical == "/internal/web/interpret" for r in app.router.routes()))
