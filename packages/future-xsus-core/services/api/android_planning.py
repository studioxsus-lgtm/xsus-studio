"""Opt-in service-to-service Android planning endpoint."""
import hmac
import json
import re
from dataclasses import asdict
from aiohttp import web
from languages.sq.project_context import ProjectContext
from languages.sq.complex_requests import analyze_requirements
from core.routing.sq_android_integration import plan_android_application
from core.routing.sq_android_target_profile import prepare_atomic_json_profile
from core.routing.sq_hyper_bridge import prepare_review

def plan_payload(data):
    if not isinstance(data, dict) or set(data) != {"project_id","prompts","application_id","display_name","min_sdk","accept_storage_profile"}:
        raise ValueError("Invalid planning request")
    if not isinstance(data["project_id"], str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,128}",data["project_id"]):
        raise ValueError("Invalid project identifier")
    prompts=data["prompts"]
    if not isinstance(prompts,list) or not 1 <= len(prompts) <= 64 or any(not isinstance(p,str) or not 1 <= len(p) <= 4096 for p in prompts):
        raise ValueError("Invalid prompts")
    if data["accept_storage_profile"] is not True or not isinstance(data["application_id"],str) or not isinstance(data["display_name"],str) or type(data["min_sdk"]) is not int:
        raise ValueError("Invalid target profile")
    # A multi-page task request supplies the existing structured navigation preference.
    if len(prompts) == 1:
        match = re.fullmatch(r"(.+?)(?:,?\s+(?:me|në) (?:shumë|disa) faqe(?: dhe (?:dizajn modern|moderne))?)\s*[.!]?\s*", prompts[0], re.IGNORECASE)
        if match:
            prompts = [match[1].strip(), "Krijo një dizajn modern me navigim të poshtëm"]
        else:
            application = analyze_requirements(prompts[0])
            if application and application.features == ("restaurant_orders",):
                prompts = [prompts[0], "Krijo një dizajn modern me navigim të poshtëm"]
    outcome=plan_android_application(ProjectContext(data["project_id"]),tuple(prompts),data["application_id"],data["display_name"],data["min_sdk"])
    if outcome.status != "draft_ready":
        return {"status":outcome.status,"execution_authorized":False}
    try:
        plan=prepare_atomic_json_profile(outcome.plan,accept_storage_profile=True)
    except ValueError:
        return {"status":"review_required","execution_authorized":False}
    return {"status":"draft_ready","plan":asdict(plan),"reviewRequest":prepare_review(outcome.context),"execution_authorized":False}

def attach_android_planning(app, token):
    if not isinstance(token,str) or not re.fullmatch(r"[A-Za-z0-9._~-]{32,256}",token):
        raise ValueError("Invalid Android planning service token")
    expected=("Bearer "+token).encode()
    async def handler(request):
        if not hmac.compare_digest(request.headers.get("Authorization","").encode(),expected):
            return web.json_response({"error":"unauthorized"},status=401)
        if request.content_type != "application/json":
            return web.json_response({"error":"invalid_content_type"},status=415)
        try:
            body=bytearray()
            async for chunk in request.content.iter_chunked(8192):
                body.extend(chunk)
                if len(body)>262144:
                    return web.json_response({"error":"request_too_large"},status=413)
            result=plan_payload(json.loads(body))
        except (ValueError,TypeError):
            return web.json_response({"error":"invalid_request"},status=400)
        return web.json_response(result)
    app.router.add_post("/internal/android/plan",handler)


