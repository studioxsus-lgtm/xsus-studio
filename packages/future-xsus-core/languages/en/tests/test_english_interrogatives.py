import unittest

from languages.en.text.grammar import IssueCode
from languages.en.text.linguistics import analyze_english
from languages.en.text.syntax import ClauseKind, InterrogativeRole


class EnglishInterrogativeTests(unittest.TestCase):
    def test_subject_questions_keep_the_original_object_and_polarity(self):
        for sentence, subject, object_, negative in (
            ("Who wrote the report?", "Who", "the report", False),
            ("Who didn’t write the report?", "Who", "the report", True),
            ("Who could write the report?", "Who", "the report", False),
            ("What fell?", "What", None, False),
        ):
            with self.subTest(sentence=sentence):
                result = analyze_english(sentence)
                clause = result.clause
                self.assertEqual(clause.kind, ClauseKind.QUESTION)
                self.assertEqual(clause.interrogative_role, InterrogativeRole.SUBJECT)
                self.assertEqual(clause.subject.text, subject)
                self.assertIsNone(clause.subject.number)
                self.assertEqual(clause.object.text if clause.object else None, object_)
                self.assertEqual(clause.negated, negative)
                self.assertEqual(result.issues, ())

    def test_object_questions_keep_the_subject_auxiliary_and_polarity(self):
        for sentence, subject, object_, auxiliary, negative in (
            ("What did Alex write?", "Alex", "What", "do", False),
            ("Who didn’t they call?", "they", "Who", "do", True),
            ("Whom hasn’t Alex called?", "Alex", "Whom", "have", True),
            ("What is Alex writing?", "Alex", "What", "be", False),
            ("What could the teachers write?", "the teachers", "What", "could", False),
        ):
            with self.subTest(sentence=sentence):
                result = analyze_english(sentence)
                clause = result.clause
                self.assertEqual(clause.kind, ClauseKind.QUESTION)
                self.assertEqual(clause.interrogative_role, InterrogativeRole.OBJECT)
                self.assertEqual((clause.subject.text, clause.object.text), (subject, object_))
                self.assertEqual((clause.auxiliary.lemma, clause.negated), (auxiliary, negative))
                self.assertEqual(result.issues, ())

    def test_reports_agreement_and_verb_form_in_object_questions(self):
        result = analyze_english("What does they wrote?")
        self.assertEqual([(issue.code, issue.suggested) for issue in result.issues], [
            (IssueCode.SUBJECT_VERB_AGREEMENT, "do"),
            (IssueCode.AUXILIARY_VERB_FORM, "write"),
        ])

    def test_rejects_unimplemented_roles_and_invalid_argument_structures(self):
        for sentence in (
            "What?", "What did Maya write the report?", "What did Maya sleep?",
            "Whom wrote the report?", "Who is Maya?", "How many reports did Maya write?",
            "I know who wrote the report.", "What might Maya have written?",
        ):
            with self.subTest(sentence=sentence):
                self.assertIsNone(analyze_english(sentence))
