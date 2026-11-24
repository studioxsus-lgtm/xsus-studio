import unittest
from languages.sq.project_context import ProjectContext
from core.routing.sq_application_planning import plan_application

KEYS = ("schema_version", "project_id", "revision", "snapshot_digest")
def review(r):
    return {**{k:r[k] for k in KEYS}, "status":"accepted", "findings":[]}
def build(r):
    return {**{k:r[k] for k in KEYS}, "status":"planned", "plan_id":"test-plan"}
def forbidden(r):
    raise AssertionError("Unexpected transport call")

class ApplicationPlanningTests(unittest.TestCase):
    def setUp(self):
        self.context = ProjectContext("android-demo")
        self.prompts = ("Krijo aplikacion Android me njoftime",
                        "Krijo dizajn modern me temë të errët",
                        "Krijo tabelën tasks me kolonat id: uuid",
                        "Shto sigurinë me autentikim")

    def test_end_to_end(self):
        def inspect(r):
            self.assertEqual(r["specification"]["application"]["platform"], "android")
            self.assertEqual(r["specification"]["design"]["theme"], "dark")
            self.assertEqual(r["specification"]["database"][0]["table"], "tasks")
            self.assertEqual(r["specification"]["security"]["requested"], ["authentication"])
            return build(r)
        result = plan_application(self.context, self.prompts, review, inspect)
        self.assertEqual((result.status, result.plan_id, result.context.revision), ("planned", "test-plan", 4))
        self.assertFalse(result.execution_authorized)

    def test_invalid_prompt_atomic(self):
        result = plan_application(self.context, self.prompts + ("unknown",), forbidden, forbidden)
        self.assertEqual(result.status, "unresolved")
        self.assertIs(result.context, self.context)

    def test_rejected(self):
        result = plan_application(self.context, self.prompts, lambda r: {**review(r), "status":"rejected"}, forbidden)
        self.assertEqual(result.status, "rejected")

    def test_needs_changes(self):
        result = plan_application(self.context, self.prompts, lambda r: {**review(r), "status":"needs_changes"}, forbidden)
        self.assertEqual(result.status, "needs_changes")

    def test_invalid_review(self):
        self.assertEqual(plan_application(self.context, self.prompts, lambda r: {}, forbidden).status, "review_failed")

    def test_invalid_plan(self):
        self.assertEqual(plan_application(self.context, self.prompts, review, lambda r: {}).status, "planning_failed")

    def test_incomplete(self):
        self.assertEqual(plan_application(self.context, self.prompts[1:], forbidden, forbidden).status, "incomplete")

    def test_timeout(self):
        def timeout(r):
            raise TimeoutError()
        self.assertEqual(plan_application(self.context, self.prompts, timeout, forbidden).status, "review_failed")
        self.assertEqual(plan_application(self.context, self.prompts, review, timeout).status, "planning_failed")

    def test_bounds(self):
        with self.assertRaises(ValueError):
            plan_application(self.context, (), forbidden, forbidden)
