import unittest

from languages.en.text.grammar import IssueCode
from languages.en.text.linguistics import analyze_english
from languages.en.text.syntax import InterrogativeRole


class EnglishWhAdverbTests(unittest.TestCase):
    def test_adverb_questions_keep_existing_clause_roles(self):
        cases = (
            ("Where did Alex call Sam?", InterrogativeRole.LOCATION, "call", "Sam", False),
            ("When will the teachers finish?", InterrogativeRole.TIME, "finish", None, False),
            ("How can they send the invoice?", InterrogativeRole.MANNER, "send", "the invoice", False),
            ("Why didn’t Alex write the report?", InterrogativeRole.REASON, "write", "the report", True),
            ("Why isn't the teacher ready?", InterrogativeRole.REASON, "be", None, True),
        )
        for sentence, role, lemma, object_text, negative in cases:
            with self.subTest(sentence=sentence):
                result = analyze_english(sentence)
                clause = result.clause
                self.assertEqual((clause.interrogative_role, clause.lemma, clause.negated), (role, lemma, negative))
                self.assertEqual(clause.object.text if clause.object else None, object_text)
                self.assertEqual(result.issues, ())

    def test_bare_copula_uses_fronted_place_or_time_as_complement(self):
        for sentence, subject, complement, role in (
            ("Where is Alex?", "Alex", "Where", InterrogativeRole.LOCATION),
            ("When is the meeting?", "the meeting", "When", InterrogativeRole.TIME),
        ):
            with self.subTest(sentence=sentence):
                result = analyze_english(sentence)
                clause = result.clause
                self.assertEqual((clause.subject.text, clause.complement, clause.interrogative_role), (subject, complement, role))
                self.assertEqual(clause.lemma, "be")
                self.assertIsNone(clause.auxiliary)
                self.assertIsNone(clause.object)
                self.assertEqual(result.issues, ())

    def test_existing_grammar_checks_apply_to_adverb_questions(self):
        for sentence, expected in (
            ("When did Alex wrote the report?", (IssueCode.AUXILIARY_VERB_FORM, "write")),
            ("Where is they?", (IssueCode.SUBJECT_VERB_AGREEMENT, "are")),
        ):
            with self.subTest(sentence=sentence):
                result = analyze_english(sentence)
                (issue,) = result.issues
                self.assertEqual((issue.code, issue.suggested), expected)

    def test_complex_or_incomplete_questions_remain_unsupported(self):
        for sentence in (
            "Where?", "Where Alex lives?", "Why did Alex?", "How long did Alex wait?",
            "Why didn't Alex not write?", "How was the report being written?", "Where did Alex say Sam went?",
        ):
            with self.subTest(sentence=sentence):
                self.assertIsNone(analyze_english(sentence))
