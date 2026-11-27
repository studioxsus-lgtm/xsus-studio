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
            return web.json_response(interpret_brand(data) if data.get('operation') == 'brand.interpret' else interpret_logo(data))
        except (ValueError, TypeError):
            return web.json_response({"error":"invalid_request"}, status=400)
    app.router.add_post("/internal/logo/interpret", handler)

def interpret_brand(data):
    if data.get("version") != "5.0.0" or data.get("operation") != "brand.interpret" or not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", str(data.get("requestId",""))):
        raise ValueError("Invalid brand contract")
    prompt, language = data.get("prompt"), data.get("language")
    if not isinstance(prompt,str) or not 1 <= len(prompt.strip()) <= 4000 or language not in ("en","fr","sq"):
        raise ValueError("Invalid brand request")
    name = re.search(r'["“]([^"”]{1,120})["”]',prompt)
    if not name:
        raise ValueError("Quoted brand name required")
    s=prompt.casefold()
    groups={"guidelines":("guidelines","manual","udhëz","charte"),"mockup":("mockup","maquette","model"),"animation":("animation","animim","animacion","anime"),"package":("brand kit","paket","package","identité complète")}
    actions=[k for k,words in groups.items() if any(w in s for w in words)]
    if len(actions)!=1:
        raise ValueError("Ambiguous brand action")
    profile=next((x for x in ("fade","pulse","bounce","spin","zoom") if re.search(r"\b"+x+r"\b",s)),"fade")
    mockup=next((x for x in ("flat:business-card","digital:website","cylinder:mug","textile:tshirt") if x in s),"flat:business-card")
    fmt=next((x for x in ("mp4","webm","gif","png","svg") if re.search(r"\b"+x+r"\b",s)),"svg")
    return {"version":"5.0.0","requestId":data["requestId"],"intent":{"action":actions[0],"name":name.group(1),"language":language,"profile":profile,"mockup":mockup,"format":fmt}}
