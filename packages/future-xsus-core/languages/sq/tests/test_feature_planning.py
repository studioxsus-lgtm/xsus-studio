import unittest
from languages.sq.feature_planning import plan_features

class FeaturePlanningTests(unittest.TestCase):
    def test_classification(self):
        result = plan_features("Krijo aplikacion Android me autentikim, databazë dhe njoftime")
        self.assertEqual(result.categorized, (("authentication", "security"), ("database", "data"), ("notifications", "features")))
        self.assertEqual(result.platform, "android")

    def test_transitive_dependencies(self):
        result = plan_features("Krijo aplikacion me rol")
        self.assertEqual(result.requested, ("role",))
        self.assertEqual(result.suggested_dependencies, ("authentication", "authorization"))
        self.assertEqual(result.ordered_features, ("authentication", "authorization", "role"))

    def test_explicit_dependencies(self):
        result = plan_features("Krijo aplikacion me kopje rezervë dhe databazë")
        self.assertEqual(result.suggested_dependencies, ())
        self.assertEqual(result.ordered_features, ("database", "backup"))

    def test_theme_clarification(self):
        result = plan_features("Krijo aplikacion me temë të errët dhe temë të çelët")
        self.assertEqual(result.clarification_pairs, (("dark_theme", "light_theme"),))

    def test_no_authorization(self):
        self.assertFalse(plan_features("Krijo aplikacion me pagesa").execution_authorized)

    def test_reject_unknown(self):
        self.assertIsNone(plan_features("Krijo aplikacion me pagesa dhe zzqx"))

    def test_empty_features(self):
        self.assertEqual(plan_features("Krijo aplikacion").ordered_features, ())

    def test_task_management(self):
        result = plan_features("Ndërto një aplikacion për menaxhimin e detyrave me njoftime")
        self.assertEqual(result.ordered_features, ("task_management", "notifications"))
