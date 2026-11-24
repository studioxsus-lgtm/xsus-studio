import unittest
from languages.sq.project_context import ProjectContext, update_project
from core.routing.sq_preview_orchestrator import coordinate_preview

def draft(request):
    return {"status":"completed","safety":{"executable":False,"sideEffects":False},
            "plan":{"steps":request["steps"]}}
def approve(*args):
    return True
def forbidden(*args):
    raise AssertionError("Unexpected call")
def preview(request):
    return {"kind":"static-preview","requiresReview":True,"files":[
        {"path":"index.html","content":"<main>Preview</main>"},
        {"path":"styles.css","content":"main {}"},
        {"path":"main.js","content":"const ready = true;"}]}

class PreviewOrchestratorTests(unittest.TestCase):
    def context(self, prompt="Krijo aplikacion web"):
        return update_project(ProjectContext("p1"),"p1",0,prompt).context

    def test_flow(self):
        def check(context, request, response, build):
            self.assertEqual(context.project_id,"p1")
            self.assertEqual(request["goal"],build["goal"])
            self.assertEqual(response["plan"]["steps"],request["steps"])
            return True
        result = coordinate_preview(self.context(),draft,check,preview)
        self.assertEqual(result.status,"preview_ready")
        self.assertFalse(result.execution_authorized)
        self.assertTrue(result.preview.requires_review)

    def test_native_blocked(self):
        self.assertEqual(coordinate_preview(self.context("Krijo aplikacion Android"),forbidden,forbidden,forbidden).status,"unsupported_platform")

    def test_features_not_dropped(self):
        self.assertEqual(coordinate_preview(self.context("Krijo aplikacion web me njoftime"),forbidden,forbidden,forbidden).status,"unsupported_features")

    def test_no_approval(self):
        for value in (False,None,1):
            self.assertEqual(coordinate_preview(self.context(),draft,lambda *a:value,forbidden).status,"approval_required")

    def test_review_required(self):
        def review(r):
            return {**draft(r),"status":"review_required"}
        self.assertEqual(coordinate_preview(self.context(),review,forbidden,forbidden).status,"review_required")

    def test_unsafe_draft(self):
        self.assertEqual(coordinate_preview(self.context(),lambda r:{**draft(r),"safety":{"executable":True}},forbidden,forbidden).status,"invalid_draft")

    def test_bad_preview(self):
        self.assertEqual(coordinate_preview(self.context(),draft,approve,lambda r:{}).status,"integration_failed")

    def test_timeout(self):
        def timeout(*args):
            raise TimeoutError()
        self.assertEqual(coordinate_preview(self.context(),timeout,forbidden,forbidden).status,"integration_failed")

    def test_incomplete(self):
        self.assertEqual(coordinate_preview(ProjectContext("p1"),forbidden,forbidden,forbidden).status,"incomplete")
