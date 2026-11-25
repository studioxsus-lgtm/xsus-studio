"""Draft-only Web interpretation service."""
import hmac
import json
import re
from aiohttp import web

def interpret_web(data):
    if not isinstance(data, dict) or set(data) != {"contractVersion", "prompt", "name", "language", "executionAllowed"}:
        raise ValueError("Invalid contract")
    if data["contractVersion"] != "1.0.0" or data["executionAllowed"] is not False or data["language"] not in ("en", "sq", "fr"):
        raise ValueError("Invalid contract")
    for key, limit in (("prompt", 12000), ("name", 120)):
        if not isinstance(data[key], str) or not data[key].strip() or len(data[key]) > limit:
            raise ValueError("Invalid text")
    return {"contractVersion": "1.0.0", "status": "ready", "prompt": data["prompt"].strip(), "name": data["name"].strip(), "language": data["language"], "executionAllowed": False}

def attach_web_interpret(app, token):
    if not isinstance(token, str) or not re.fullmatch(r"[A-Za-z0-9._~-]{32,256}", token):
        raise ValueError("Invalid Web service token")
    expected = ("Bearer " + token).encode()
    async def handler(request):
        if not hmac.compare_digest(request.headers.get("Authorization", "").encode(), expected):
            return web.json_response({"error": "unauthorized"}, status=401)
        if request.content_type != "application/json":
            return web.json_response({"error": "invalid_content_type"}, status=415)
        try:
            body = bytearray()
            async for chunk in request.content.iter_chunked(8192):
                body.extend(chunk)
                if len(body) > 65536:
                    return web.json_response({"error": "request_too_large"}, status=413)
            return web.json_response(interpret_web(json.loads(body)))
        except (ValueError, TypeError):
            return web.json_response({"error": "invalid_request"}, status=400)
    app.router.add_post("/internal/web/interpret", handler)
