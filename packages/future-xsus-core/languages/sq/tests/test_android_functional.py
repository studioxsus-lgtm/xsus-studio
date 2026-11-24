import unittest
from languages.sq.project_context import ProjectContext, update_project
from core.routing.sq_android_functional import prepare_functional_plan

class FunctionalPlanTests(unittest.TestCase):
    def plan(self, prompt):
        result = update_project(ProjectContext("p1"),"p1",0,prompt)
        self.assertEqual(result.status,"updated")
        return prepare_functional_plan(result.context,"com.xsus.app","XSUS")

    def test_defaults(self):
        p = self.plan("Krijo aplikacion Android")
        self.assertIn("event_dispatch",p.capabilities)
        self.assertFalse(p.execution_authorized)

    def test_tasks(self):
        p = self.plan("Krijo aplikacion Android me menaxhim detyrash")
        self.assertIn("create_task",p.capabilities)
        self.assertIn("delete_task",p.capabilities)

    def test_search_filter(self):
        p = self.plan("Krijo aplikacion Android me kërkim dhe filtrim")
        self.assertIn("search_results",p.capabilities)
        self.assertIn("filter_state",p.capabilities)

    def test_payments(self):
        p = self.plan("Krijo aplikacion Android me pagesa")
        self.assertIn("payment_provider_required",p.capabilities)

    def test_notifications(self):
        self.assertIn("notification_permission_check",self.plan("Krijo aplikacion Android me njoftime").capabilities)

    def test_files(self):
        p = self.plan("Krijo aplikacion Android")
        self.assertEqual(len(p.required_files),17)
        self.assertEqual(len(set(p.required_files)),17)

    def test_unknown(self):
        p = self.plan("Krijo aplikacion Android me temë të errët")
        self.assertEqual(p.unresolved_features,("dark_theme",))

    def test_wrong_platform(self):
        with self.assertRaises(ValueError):
            self.plan("Krijo aplikacion web")
