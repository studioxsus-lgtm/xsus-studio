import unittest
from languages.sq.project_context import ProjectContext, update_project
from core.routing.sq_legacy_draft_adapter import prepare_legacy_draft

class LegacyDraftAdapterTests(unittest.TestCase):
    def context(self, prompt):
        result = update_project(ProjectContext("p1"), "p1", 0, prompt)
        self.assertEqual(result.status, "updated")
        return result.context

    def test_android(self):
        result = prepare_legacy_draft(self.context("Krijo aplikacion Android me njoftime"))
        self.assertEqual(result["goal"], "Build an android application")
        self.assertEqual(result["steps"][1]["task"], "Plan notifications")
        self.assertEqual(set(result), {"goal", "steps"})

    def test_web(self):
        self.assertEqual(prepare_legacy_draft(self.context("Krijo aplikacion web"))["goal"], "Build a web application")

    def test_incomplete(self):
        with self.assertRaises(ValueError):
            prepare_legacy_draft(ProjectContext("p1"))

    def test_no_silent_loss(self):
        context = self.context("Krijo aplikacion Android")
        context = update_project(context, "p1", 1, "Krijo dizajn modern").context
        with self.assertRaises(ValueError):
            prepare_legacy_draft(context)

    def test_unsupported_feature(self):
        with self.assertRaises(ValueError):
            prepare_legacy_draft(self.context("Krijo aplikacion me eksport"))

    def test_step_contract(self):
        result = prepare_legacy_draft(self.context("Krijo aplikacion me njoftime dhe pagesa"))
        self.assertEqual([s["id"] for s in result["steps"]], ["step-1", "step-2", "step-3"])
        self.assertTrue(all(s["dependsOn"] == [] for s in result["steps"]))
