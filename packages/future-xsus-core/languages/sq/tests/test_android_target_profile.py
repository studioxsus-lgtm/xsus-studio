import unittest
from types import SimpleNamespace
from core.routing.sq_android_persistence_security import PersistenceSecurityPlan
from core.routing.sq_android_target_profile import prepare_atomic_json_profile

def fixture():
    android = SimpleNamespace(features=("task_management",), application_id="com.xsus.tasks", required_files=("settings.gradle.kts",))
    ui = SimpleNamespace(android=android,navigation="single_screen",style="modern",motion="system",adaptive_layout=False,typography="material_default")
    return PersistenceSecurityPlan(SimpleNamespace(ui=ui),("datastore_preferences","room"),(),(),(),(),(),("old",))

class TargetProfileTests(unittest.TestCase):
    def test_explicit_profile(self):
        p=fixture()
        result=prepare_atomic_json_profile(p,accept_storage_profile=True)
        self.assertEqual(result.storage,("atomic_json",))
        self.assertEqual(p.storage,("datastore_preferences","room"))
        self.assertFalse(result.execution_authorized)
        self.assertIn("app/src/main/java/com/xsus/tasks/data/TaskStore.kt",result.required_files)
    def test_requires_acceptance(self):
        with self.assertRaises(ValueError):
            prepare_atomic_json_profile(fixture())
    def test_unsupported_feature(self):
        p=fixture()
        p.functional.ui.android.features=("task_management","payments")
        with self.assertRaises(ValueError):
            prepare_atomic_json_profile(p,accept_storage_profile=True)
    def test_unsupported_design(self):
        p=fixture()
        p.functional.ui.navigation="drawer"
        with self.assertRaises(ValueError):
            prepare_atomic_json_profile(p,accept_storage_profile=True)
    def test_unresolved(self):
        from dataclasses import replace
        with self.assertRaises(ValueError):
            prepare_atomic_json_profile(replace(fixture(),unresolved=("missing_schema",)),accept_storage_profile=True)
