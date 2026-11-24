import unittest
from languages.sq.project_context import ProjectContext, update_project

class ProjectContextTests(unittest.TestCase):
    def setUp(self):
        self.initial = ProjectContext("p1")

    def apply(self, context, text):
        result = update_project(context, "p1", context.revision, text)
        self.assertEqual(result.status, "updated")
        self.assertFalse(result.execution_authorized)
        return result.context

    def test_composition(self):
        state = self.apply(self.initial, "Krijo aplikacion Android me njoftime")
        state = self.apply(state, "Krijo dizajn modern me temë të errët")
        state = self.apply(state, "Krijo tabelën tasks me kolonat id: uuid")
        state = self.apply(state, "Shto sigurinë me autentikim")
        self.assertEqual(state.revision, 4)
        self.assertEqual(state.application.platform, "android")
        self.assertEqual(state.design.theme, "dark")
        self.assertEqual(state.database[0].table, "tasks")
        self.assertEqual(state.security.requested, ("authentication",))
        self.assertEqual(self.initial.revision, 0)

    def test_feature_merge(self):
        state = self.apply(self.initial, "Krijo aplikacion Android me njoftime")
        state = self.apply(state, "Krijo aplikacion me pagesa")
        self.assertEqual(state.application.features, ("notifications", "payments"))
        self.assertEqual(state.application.platform, "android")

    def test_isolation(self):
        result = update_project(self.initial, "p2", 0, "Krijo aplikacion")
        self.assertEqual(result.status, "project_mismatch")
        self.assertIs(result.context, self.initial)

    def test_revision(self):
        self.assertEqual(update_project(self.initial, "p1", 1, "Krijo aplikacion").status, "revision_conflict")

    def test_unknown(self):
        self.assertEqual(update_project(self.initial, "p1", 0, "zzqx").status, "unresolved")

    def test_platform_conflict(self):
        state = self.apply(self.initial, "Krijo aplikacion Android")
        self.assertEqual(update_project(state, "p1", 1, "Krijo aplikacion iOS").status, "platform_conflict")

    def test_schema_conflict(self):
        state = self.apply(self.initial, "Krijo tabelën tasks me kolonat id: uuid")
        self.assertEqual(update_project(state, "p1", 1, "Krijo tabelën tasks me kolonat id: tekst").status, "schema_conflict")

    def test_security_merge(self):
        state = self.apply(self.initial, "Shto sigurinë me autentikim me dy faktorë")
        state = self.apply(state, "Shto sigurinë me autentikim")
        self.assertEqual(state.security.suggested_controls, ())

    def test_idempotency(self):
        state = self.apply(self.initial, "Krijo aplikacion Android")
        self.assertEqual(update_project(state, "p1", 1, "Krijo aplikacion Android").status, "unchanged")
