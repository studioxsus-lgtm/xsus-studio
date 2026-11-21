"""Phase 3.3 explicit grammatical role tests."""
import unittest

from languages.en.text.understanding.role_semantics_v1 import (
    classify_sentence_roles, sentence_roles_dict,
)


class RoleSemanticsTests(unittest.TestCase):
    def test_pronoun_and_definite_object(self):
        result = classify_sentence_roles("She reads the report.")
        self.assertEqual(result.status, "resolved")
        self.assertEqual(result.subject_kind, "third_person_pronoun")
        self.assertEqual(result.object_kind, "definite_object")
        self.assertEqual(result.action, "read")

    def test_nominal_and_indefinite_object(self):
        result = classify_sentence_roles("The developer creates a project.")
        self.assertEqual(result.subject_kind, "explicit_nominal")
        self.assertEqual(result.object_kind, "indefinite_object")

    def test_first_and_second_person(self):
        self.assertEqual(classify_sentence_roles("I read the report.").subject_kind,
                         "first_person_pronoun")
        self.assertEqual(classify_sentence_roles("You read the report.").subject_kind,
                         "second_person_pronoun")

    def test_negative_polarity_preserved(self):
        result = classify_sentence_roles("She does not read the report.")
        self.assertEqual(result.polarity, "negative")

    def test_unsupported_abstains_without_echo(self):
        result = sentence_roles_dict("She reads private records.")
        self.assertEqual(result["status"], "abstained")
        self.assertNotIn("private records", repr(result))

    def test_no_entity_resolution_claim(self):
        result = sentence_roles_dict("She reads the report.")
        self.assertFalse(result["real_world_agent_verified"])
        self.assertFalse(result["entity_coreference_proven"])
        self.assertFalse(result["production_authorized"])


if __name__ == "__main__":
    unittest.main()
