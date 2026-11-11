import json
import subprocess
import sys
import unittest
from pathlib import Path

from languages.en.text.grammar import IssueCode
from languages.en.text.linguistics import analyze_english
from languages.en.text.morphology import inflect_verb
from languages.en.text.syntax import ClauseKind


class EnglishAuxiliaryTests(unittest.TestCase):
    def test_irregular_paradigms_distinguish_past_from_participle(self):
        for lemma, past, participle in (
            ("choose", "chose", "chosen"), ("drive", "drove", "driven"),
            ("eat", "ate", "eaten"), ("fly", "flew", "flown"), ("teach", "taught", "taught"),
        ):
            with self.subTest(lemma=lemma):
                forms = inflect_verb(lemma)
                self.assertEqual((forms.past, forms.past_participle), (past, participle))

    def test_subject_and_object_survive_negation_and_inversion(self):
        for sentence, kind, negated in (
            ("Alex wrote the report.", ClauseKind.DECLARATIVE, False),
            ("Alex did not write the report.", ClauseKind.DECLARATIVE, True),
            ("Did Alex write the report?", ClauseKind.QUESTION, False),
            ("Did Alex not write the report?", ClauseKind.QUESTION, True),
            ("Didn’t Alex write the report?", ClauseKind.QUESTION, True),
        ):
            with self.subTest(sentence=sentence):
                result = analyze_english(sentence)
                clause = result.clause
                self.assertEqual((clause.subject.text, clause.lemma, clause.object.text), ("Alex", "write", "the report"))
                self.assertEqual((clause.kind, clause.negated), (kind, negated))
                self.assertEqual(result.issues, ())

    def test_auxiliary_and_main_verb_are_exposed_separately(self):
        clause = analyze_english("Have the young teachers read the notes?").clause
        self.assertEqual((clause.auxiliary.text, clause.auxiliary.lemma), ("Have", "have"))
        self.assertEqual((clause.subject.head, clause.verb, clause.lemma, clause.object.head), ("teachers", "read", "read", "notes"))

    def test_do_requires_base_form(self):
        for wrong, observed, suggested in (
            ("Did Alex wrote the report?", "wrote", "write"),
            ("Nora did not chose the plan.", "chose", "choose"),
            ("Does Liam drives?", "drives", "drive"),
        ):
            with self.subTest(sentence=wrong):
                (issue,) = analyze_english(wrong).issues
                self.assertEqual((issue.code, issue.observed, issue.suggested), (IssueCode.AUXILIARY_VERB_FORM, observed, suggested))

    def test_have_requires_past_participle(self):
        for wrong, correct, expected in (
            ("Alex has wrote the report.", "Alex has written the report.", "written"),
            ("Has Maya ate?", "Has Maya eaten?", "eaten"),
            ("Sofia had not drove.", "Sofia had not driven.", "driven"),
            ("Noah hasn't chose the plan.", "Noah hasn't chosen the plan.", "chosen"),
        ):
            with self.subTest(sentence=wrong):
                (issue,) = analyze_english(wrong).issues
                self.assertEqual((issue.code, issue.suggested), (IssueCode.AUXILIARY_VERB_FORM, expected))
                self.assertEqual(analyze_english(correct).issues, ())

    def test_progressive_be_requires_ing_form_and_checks_agreement(self):
        (issue,) = analyze_english("Mia is read the notes.").issues
        self.assertEqual((issue.code, issue.suggested), (IssueCode.AUXILIARY_VERB_FORM, "reading"))
        (issue,) = analyze_english("Is the children reading the notes?").issues
        self.assertEqual((issue.code, issue.suggested), (IssueCode.SUBJECT_VERB_AGREEMENT, "are"))
        for sentence in ("Mia is reading the notes.", "Are the children reading the notes?", "Mia isn't sleeping."):
            with self.subTest(sentence=sentence):
                self.assertEqual(analyze_english(sentence).issues, ())

    def test_reports_agreement_and_verb_form_as_independent_errors(self):
        issues = analyze_english("They does not writes.").issues
        self.assertEqual([(issue.code, issue.suggested) for issue in issues], [
            (IssueCode.SUBJECT_VERB_AGREEMENT, "do"),
            (IssueCode.AUXILIARY_VERB_FORM, "write"),
        ])

    def test_lexical_have_and_copular_be_remain_distinct(self):
        for sentence, lemma in (("Alex has the report.", "have"), ("Is Nora ready?", "be"), ("Nora is not a teacher.", "be")):
            with self.subTest(sentence=sentence):
                result = analyze_english(sentence)
                self.assertIsNone(result.clause.auxiliary)
                self.assertEqual(result.clause.lemma, lemma)
                self.assertEqual(result.issues, ())

    def test_unsupported_forms_do_not_receive_misleading_progressive_diagnostics(self):
        for sentence in (
            "The report was written.", "Was the report written?", "What did Alex write?",
            "Alex has been writing.", "Did not Alex write?",
        ):
            with self.subTest(sentence=sentence):
                self.assertIsNone(analyze_english(sentence))

    def test_command_outputs_auxiliary_and_diagnostics_as_json(self):
        root = Path(__file__).resolve().parents[3]
        result = subprocess.run(
            [sys.executable, "-m", "languages.en.text.linguistics", "clause", "Did Liam drove?"],
            cwd=root, check=True, capture_output=True, text=True,
        )
        report = json.loads(result.stdout)
        self.assertEqual(report["clause"]["auxiliary"]["lemma"], "do")
        self.assertEqual(report["issues"][0]["suggested"], "drive")
