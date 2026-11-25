"""Internal logo interpretation endpoint."""
import hmac
import json
import re
from aiohttp import web
from .logo_interpret import interpret_logo

def attach_logo_interpret(app, token):
    if not isinstance(token, str) or not re.fullmatch(r"[A-Za-z0-9._~-]{32,256}", token):
        raise ValueError("Invalid Logo service token")
    expected = ("Bearer " + token).encode()
    async def handler(request):
        if not hmac.compare_digest(request.headers.get("Authorization", "").encode(), expected):
            return web.json_response({"error":"unauthorized"}, status=401)
        if request.content_type != "application/json":
            return web.json_response({"error":"invalid_content_type"}, status=415)
        try:
            body = bytearray()
            async for chunk in request.content.iter_chunked(8192):
                body.extend(chunk)
                if len(body) > 32768:
                    return web.json_response({"error":"request_too_large"}, status=413)
            data = json.loads(body)
            if not isinstance(data, dict) or set(data) != {"version","requestId","operation","prompt","language"}:
                raise ValueError("Invalid contract")
            return web.json_response(interpret_logo(data))
        except (ValueError, TypeError):
            return web.json_response({"error":"invalid_request"}, status=400)
    app.router.add_post("/internal/logo/interpret", handler)
