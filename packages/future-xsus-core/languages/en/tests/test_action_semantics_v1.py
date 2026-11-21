"""Phase 3 bounded action semantics regression tests."""
import unittest

from languages.en.text.understanding.action_semantics_v1 import (
    action_semantics_dict, classify_action_semantics,
)


class ActionSemanticsTests(unittest.TestCase):
    def test_information_access(self):
        result = classify_action_semantics("She reads the report.")
        self.assertEqual(result.status, "resolved")
        self.assertEqual(result.category, "information_access")
        self.assertEqual(result.action, "read")

    def test_verification_category(self):
        result = classify_action_semantics("They test the model.")
        self.assertEqual(result.category, "verification")

    def test_negative_polarity_preserved(self):
        result = classify_action_semantics("She does not read the report.")
        self.assertEqual(result.category, "information_access")
        self.assertEqual(result.polarity, "negative")

    def test_distinct_categories(self):
        examples = {
            "She writes the report.": "content_creation",
            "The developer builds the application.": "construction",
            "The user opens the file.": "access",
            "She sends the message.": "transfer",
            "The system updates the project.": "modification",
            "The system deletes the project.": "removal",
        }
        for sentence, expected in examples.items():
            with self.subTest(sentence=sentence):
                self.assertEqual(classify_action_semantics(sentence).category, expected)

    def test_unsupported_abstains(self):
        result = classify_action_semantics("She invents the universe.")
        self.assertEqual(result.status, "abstained")
        self.assertIsNone(result.category)

    def test_no_production_or_world_claim(self):
        result = action_semantics_dict("She reads the report.")
        self.assertFalse(result["production_authorized"])
        self.assertFalse(result["open_domain_semantics_proven"])
        self.assertFalse(result["world_truth_verified"])

    def test_does_not_echo_unknown_text(self):
        result = action_semantics_dict("She invents private data.")
        self.assertNotIn("private data", repr(result))


if __name__ == "__main__":
    unittest.main()
