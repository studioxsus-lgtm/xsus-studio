import unittest
from languages.sq.project_context import ProjectContext, update_project
from core.routing.sq_android_ui import prepare_android_ui

class AndroidUIPlanTests(unittest.TestCase):
    def setUp(self):
        self.context = update_project(ProjectContext("p1"),"p1",0,"Krijo aplikacion Android").context

    def plan(self, prompt=None):
        context = self.context
        if prompt:
            result = update_project(context,"p1",1,prompt)
            self.assertEqual(result.status,"updated")
            context = result.context
        return prepare_android_ui(context,"com.xsus.app","XSUS")

    def test_defaults(self):
        p = self.plan()
        self.assertEqual((p.design_system,p.toolkit,p.theme),("material3","jetpack_compose","system"))
        self.assertFalse(p.execution_authorized)

    def test_dark(self):
        p = self.plan("Krijo dizajn modern me temë të errët dhe ngjyrë vjollcë")
        self.assertEqual((p.theme,p.primary_seed),("dark","#7C3AED"))

    def test_light(self):
        self.assertEqual(self.plan("Krijo dizajn minimalist me temë të çelët").theme,"light")

    def test_navigation(self):
        self.assertEqual(self.plan("Krijo dizajn modern me navigim të poshtëm").navigation,"bottom_bar")
        self.assertEqual(self.plan("Krijo dizajn modern me menu anësore").navigation,"drawer")

    def test_navigation_conflict(self):
        with self.assertRaises(ValueError):
            self.plan("Krijo dizajn modern me navigim të poshtëm dhe menu anësore")

    def test_motion(self):
        self.assertEqual(self.plan("Krijo dizajn modern me pa animacione").motion,"disabled")

    def test_adaptive(self):
        p = self.plan("Krijo dizajn modern me dizajn responsive dhe tipografi moderne")
        self.assertTrue(p.adaptive_layout)
        self.assertEqual(p.typography,"modern")

    def test_files(self):
        p = self.plan()
        self.assertEqual(len(p.required_files),12)
        self.assertEqual(len(set(p.required_files)),12)

    def test_accessibility(self):
        self.assertIn("contrast_validation",self.plan().accessibility_requirements)

    def test_revision(self):
        self.assertEqual(self.plan("Krijo dizajn modern").android.revision,2)
