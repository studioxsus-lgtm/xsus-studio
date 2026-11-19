import unittest

from languages.en.text.editing.paragraph import ParagraphStatus, proofread_paragraph
from languages.en.text.syntax import ClauseKind, analyze_clause


class EnglishImperativeTests(unittest.TestCase):
    def test_supported_product_goals_are_recognized_as_correct_imperatives(self):
        for sentence in (
            "Plan a task manager with projects, deadlines, and team boards.",
            "Build a safe app plan.",
            "Open the settings menu.",
        ):
            with self.subTest(sentence=sentence):
                clause = analyze_clause(sentence)
                result = proofread_paragraph(sentence)

                self.assertIsNotNone(clause)
                self.assertIs(clause.kind, ClauseKind.IMPERATIVE)
                self.assertEqual((clause.subject.text, clause.lemma), ("you", sentence.split()[0].lower()))
                self.assertIs(result.status, ParagraphStatus.UNCHANGED)
                self.assertEqual(result.text, sentence)
                self.assertFalse(any(item.review_reason for item in result.passages))

    def test_imperative_requires_a_base_form_verb(self):
        result = proofread_paragraph(
            "Plans a task manager with projects, deadlines, and team boards."
        )

        self.assertIs(result.status, ParagraphStatus.REVIEW_REQUIRED)
        self.assertEqual(result.text, "Plans a task manager with projects, deadlines, and team boards.")


if __name__ == "__main__":
    unittest.main()
