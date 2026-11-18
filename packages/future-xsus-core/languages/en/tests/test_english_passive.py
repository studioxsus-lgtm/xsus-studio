import unittest

from languages.en.text.grammar import IssueCode
from languages.en.text.linguistics import analyze_english
from languages.en.text.syntax import ClauseKind, InterrogativeRole, Voice


class EnglishPassiveTests(unittest.TestCase):
    def test_finite_be_and_past_participle_form_agentless_passives(self):
        for sentence in ("The report was written.", "The reports are checked.", "The invoice is not paid."):
            with self.subTest(sentence=sentence):
                result = analyze_english(sentence)
                self.assertIsNotNone(result)
                self.assertIs(result.clause.voice, Voice.PASSIVE)
                self.assertIsNone(result.clause.object)
                self.assertIsNone(result.clause.agent)
                self.assertEqual(result.clause.negated, " not " in sentence)
                self.assertEqual(result.issues, ())

    def test_questions_keep_polarity_agent_and_interrogative_role(self):
        cases = (
            ("Wasn't the report written by Alex?", "Alex", True, None),
            ("How was the report written by the students?", "the students", False, InterrogativeRole.MANNER),
            ("What was written by them?", "them", False, InterrogativeRole.SUBJECT),
        )
        for sentence, agent, negated, role in cases:
            with self.subTest(sentence=sentence):
                result = analyze_english(sentence)
                self.assertIsNotNone(result)
                clause = result.clause
                self.assertIs(clause.voice, Voice.PASSIVE)
                self.assertIs(clause.kind, ClauseKind.QUESTION)
                self.assertEqual((clause.agent.text, clause.negated, clause.interrogative_role), (agent, negated, role))
                self.assertEqual(result.issues, ())

    def test_passive_agreement_and_agent_case_use_existing_diagnostics(self):
        result = analyze_english("The reports was written by he.")
        self.assertEqual(
            [(issue.code, issue.suggested) for issue in result.issues],
            [(IssueCode.SUBJECT_VERB_AGREEMENT, "were"), (IssueCode.PRONOUN_CASE, "him")],
        )

    def test_copula_progressive_and_unsupported_adjuncts_stay_distinct(self):
        self.assertEqual(analyze_english("The report was revised.").clause.complement, "revised")
        self.assertIs(analyze_english("Alex was writing the report.").clause.voice, Voice.ACTIVE)
        self.assertEqual(analyze_english("Alex was write the report.").issues[0].suggested, "writing")
        for sentence in (
            "The report was written by Friday.",
            "The report was written by the meeting.",
            "The report had been written.",
            "The child was slept.",
            "What was the report written?",
        ):
            with self.subTest(sentence=sentence):
                self.assertIsNone(analyze_english(sentence))
