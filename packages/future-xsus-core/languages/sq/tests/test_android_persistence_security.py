import unittest
from languages.sq.project_context import ProjectContext, update_project
from core.routing.sq_android_persistence_security import prepare_persistence_security

class PersistenceSecurityTests(unittest.TestCase):
    def plan(self, *prompts):
        context = ProjectContext("p1")
        for prompt in prompts:
            result = update_project(context,"p1",context.revision,prompt)
            self.assertEqual(result.status,"updated")
            context = result.context
        return prepare_persistence_security(context,"com.xsus.app","XSUS")

    def test_defaults(self):
        p = self.plan("Krijo aplikacion Android")
        self.assertEqual(p.storage,("datastore_preferences",))
        self.assertFalse(p.execution_authorized)

    def test_room(self):
        p = self.plan("Krijo aplikacion Android me menaxhim detyrash")
        self.assertIn("room",p.storage)

    def test_schema(self):
        p = self.plan("Krijo aplikacion Android","Krijo tabelën tasks me kolonat id: uuid dhe title: tekst")
        self.assertEqual(p.database[0].columns,(("id","uuid"),("title","text")))
        self.assertIn("primary_key_review:tasks",p.unresolved)

    def test_missing_schema(self):
        p = self.plan("Krijo aplikacion Android","Shto operacionet krijim dhe lexim për tabelën tasks")
        self.assertIn("missing_schema:tasks",p.unresolved)

    def test_mfa(self):
        p = self.plan("Krijo aplikacion Android","Shto sigurinë me autentikim me dy faktorë")
        self.assertIn("mfa",p.requested_controls)
        self.assertIn("authentication",p.suggested_controls)
        self.assertIn("authentication_provider_required",p.unresolved)

    def test_encryption(self):
        p = self.plan("Krijo aplikacion Android","Shto sigurinë me kriptim të të dhënave")
        self.assertIn("encrypted_storage_configuration_required",p.unresolved)

    def test_permissions(self):
        p = self.plan("Krijo aplikacion Android me njoftime")
        self.assertEqual(p.permissions,("android.permission.POST_NOTIFICATIONS",))

    def test_no_unrequested_permissions(self):
        self.assertEqual(self.plan("Krijo aplikacion Android").permissions,())

    def test_files(self):
        p = self.plan("Krijo aplikacion Android me databazë dhe autentikim")
        self.assertEqual(len(p.required_files),23)
        self.assertEqual(len(set(p.required_files)),23)

    def test_wrong_platform(self):
        with self.assertRaises(ValueError):
            self.plan("Krijo aplikacion web")
