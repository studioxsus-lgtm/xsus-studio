import unittest
from languages.sq.project_context import ProjectContext, update_project
from core.routing.sq_android_plan import prepare_android_plan

class AndroidPlanTests(unittest.TestCase):
    def setUp(self):
        self.context = update_project(ProjectContext("p1"), "p1", 0, "Krijo aplikacion Android me njoftime").context

    def test_structure(self):
        p = prepare_android_plan(self.context, "com.xsus.tasks", "Tasks")
        self.assertIn("app/src/main/java/com/xsus/tasks/MainActivity.kt", p.required_files)
        self.assertIn("app/src/main/AndroidManifest.xml", p.required_files)
        self.assertEqual(len(p.required_files), len(set(p.required_files)))
        self.assertEqual(p.features, ("notifications",))
        self.assertFalse(p.execution_authorized)

    def test_binding(self):
        p = prepare_android_plan(self.context, "com.xsus.tasks", "Tasks")
        self.assertEqual((p.project_id, p.revision), ("p1", 1))
        self.assertEqual(len(p.snapshot_digest), 64)

    def test_invalid_id(self):
        for value in ("../app", "com..app", "App", "com/app", None):
            with self.assertRaises(ValueError):
                prepare_android_plan(self.context, value, "Tasks")

    def test_invalid_name(self):
        for value in ("", "x"*81, "bad\nname", None):
            with self.assertRaises(ValueError):
                prepare_android_plan(self.context, "com.xsus.tasks", value)

    def test_sdk(self):
        for value in (22, 36, True, "26"):
            with self.assertRaises(ValueError):
                prepare_android_plan(self.context, "com.xsus.tasks", "Tasks", value)

    def test_wrong_platform(self):
        context = update_project(ProjectContext("p1"), "p1", 0, "Krijo aplikacion web").context
        with self.assertRaises(ValueError):
            prepare_android_plan(context, "com.xsus.tasks", "Tasks")

    def test_incomplete(self):
        with self.assertRaises(ValueError):
            prepare_android_plan(ProjectContext("p1"), "com.xsus.tasks", "Tasks")
