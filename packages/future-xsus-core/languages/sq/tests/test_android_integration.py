import unittest
from languages.sq.project_context import ProjectContext
from core.routing.sq_android_integration import plan_android_application

class AndroidIntegrationTests(unittest.TestCase):
    def run_plan(self, *prompts, app_id="com.xsus.tasks"):
        return plan_android_application(ProjectContext("p1"), prompts, app_id, "Tasks")

    def test_complete_draft(self):
        r = self.run_plan("Krijo aplikacion Android me menaxhim detyrash", "Krijo dizajn modern me temë të errët")
        self.assertEqual(r.status, "draft_ready")
        self.assertEqual(r.context.revision, 2)
        self.assertEqual(r.plan.functional.ui.theme, "dark")
        self.assertIn("room", r.plan.storage)
        self.assertEqual(r.build_request["gradle_task"], ":app:assembleDebug")
        self.assertFalse(r.execution_authorized)
        self.assertFalse(r.build_request["execution_authorized"])

    def test_security_review(self):
        r = self.run_plan("Krijo aplikacion Android", "Shto sigurinë me autentikim")
        self.assertEqual(r.status, "review_required")
        self.assertIsNone(r.build_request)
        self.assertIn("authentication_provider_required", r.plan.unresolved)

    def test_schema_review(self):
        r = self.run_plan("Krijo aplikacion Android", "Krijo tabelën tasks me kolonat id: uuid")
        self.assertEqual(r.status, "review_required")
        self.assertIsNone(r.build_request)

    def test_atomic_failure(self):
        r = self.run_plan("Krijo aplikacion Android", "???")
        self.assertEqual(r.context.revision, 0)
        self.assertIsNone(r.plan)

    def test_web(self):
        self.assertEqual(self.run_plan("Krijo aplikacion web").status, "unsupported_platform")

    def test_incomplete(self):
        self.assertEqual(self.run_plan("Krijo dizajn modern").status, "incomplete")

    def test_invalid_id(self):
        self.assertEqual(self.run_plan("Krijo aplikacion Android", app_id="../bad").status, "invalid_specification")

    def test_bounds(self):
        with self.assertRaises(ValueError):
            self.run_plan()
        with self.assertRaises(ValueError):
            self.run_plan(*("Krijo aplikacion Android",)*65)

    def test_determinism(self):
        self.assertEqual(self.run_plan("Krijo aplikacion Android"), self.run_plan("Krijo aplikacion Android"))
