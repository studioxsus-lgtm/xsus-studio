import unittest

from languages.en.text.grammar import IssueCode, check_grammar
from languages.en.text.linguistics import analyze_english
from languages.en.text.morphology import VerbForm, inflect_verb, pluralize_noun
from languages.en.text.syntax import Number, analyze_clause


class EnglishMorphologyTests(unittest.TestCase):
    def test_regular_spelling_rules(self):
        for lemma, third, past, participle in (
            ("study", "studies", "studied", "studying"),
            ("play", "plays", "played", "playing"),
            ("plan", "plans", "planned", "planning"),
            ("panic", "panics", "panicked", "panicking"),
            ("tie", "ties", "tied", "tying"),
            ("close", "closes", "closed", "closing"),
        ):
            with self.subTest(lemma=lemma):
                forms = inflect_verb(lemma)
                self.assertEqual((forms.third_person, forms.past, forms.present_participle), (third, past, participle))
                self.assertEqual(forms.past_participle, past)

    def test_irregular_paradigms_preserve_distinct_past_and_participle(self):
        forms = inflect_verb("Write")
        self.assertEqual((forms.base, forms.third_person, forms.past, forms.past_participle), ("write", "writes", "wrote", "written"))
        self.assertIn(("were", VerbForm.NON_SINGULAR_PAST), inflect_verb("be").forms())

    def test_productive_and_irregular_noun_plurals(self):
        for noun, expected in {
            "report": "reports", "city": "cities", "box": "boxes", "quiz": "quizzes",
            "child": "children", "mouse": "mice", "sheep": "sheep", "photo": "photos",
        }.items():
            with self.subTest(noun=noun):
                self.assertEqual(pluralize_noun(noun), expected)

    def test_rejects_inputs_that_are_not_a_single_word(self):
        for word in ("", "two words", "calls?", "123"):
            with self.subTest(word=word), self.assertRaises(ValueError):
                inflect_verb(word)


class EnglishClauseTests(unittest.TestCase):
    def test_combined_analysis_distinguishes_unknown_clauses_from_correct_clauses(self):
        self.assertIsNone(analyze_english("Who called Sam?"))
        result = analyze_english("Alex called Sam.")
        self.assertEqual(result.clause.object.text, "Sam")
        self.assertEqual(result.issues, ())

    def test_word_order_changes_agent_and_object(self):
        for sentence, subject, object_ in (
            ("Alex called Sam.", "Alex", "Sam"), ("Sam called Alex.", "Sam", "Alex"),
        ):
            with self.subTest(sentence=sentence):
                clause = analyze_clause(sentence)
                self.assertEqual((clause.subject.text, clause.lemma, clause.object.text), (subject, "call", object_))

    def test_nominal_phrases_keep_head_and_number(self):
        clause = analyze_clause("The young children read the revised report.")
        self.assertEqual((clause.subject.head, clause.subject.number), ("children", Number.PLURAL))
        self.assertEqual((clause.object.head, clause.object.number), ("report", Number.SINGULAR))
        self.assertEqual(check_grammar(clause), ())

    def test_copula_marks_a_complement_instead_of_an_object(self):
        clause = analyze_clause("They are ready.")
        self.assertEqual((clause.lemma, clause.complement, clause.object), ("be", "ready", None))

    def test_unsupported_structures_do_not_invent_a_parse(self):
        for sentence in ("Who called Sam?", "Alex and Sam called Lee.", "Alex has been writing.", "Alex called Sam on Monday.", "The report was written."):
            with self.subTest(sentence=sentence):
                self.assertIsNone(analyze_clause(sentence))

    def test_present_tense_agreement_suggestions(self):
        for sentence, expected in (("They writes.", "write"), ("She write.", "writes"), ("I are ready.", "am"), ("You is ready.", "are")):
            with self.subTest(sentence=sentence):
                (issue,) = check_grammar(analyze_clause(sentence))
                self.assertIs(issue.code, IssueCode.SUBJECT_VERB_AGREEMENT)
                self.assertEqual(issue.suggested, expected)

    def test_correct_past_and_number_ambiguous_subjects(self):
        for sentence in ("They wrote.", "She read.", "You were ready.", "Sheep run.", "Sheep runs."):
            with self.subTest(sentence=sentence):
                self.assertEqual(check_grammar(analyze_clause(sentence)), ())

    def test_invalid_copula_past_and_non_finite_forms(self):
        (issue,) = check_grammar(analyze_clause("They was ready."))
        self.assertEqual(issue.suggested, "were")
        for sentence in ("She written the report.", "She writing.", "They be ready."):
            with self.subTest(sentence=sentence):
                (issue,) = check_grammar(analyze_clause(sentence))
                self.assertIs(issue.code, IssueCode.FINITE_VERB_REQUIRED)
                self.assertIsNone(issue.suggested)

    def test_pronoun_case_and_determiner_number(self):
        issues = check_grammar(analyze_clause("Him called she."))
        self.assertEqual([(item.code, item.suggested) for item in issues], [
            (IssueCode.PRONOUN_CASE, "he"), (IssueCode.PRONOUN_CASE, "her"),
        ])
        (issue,) = check_grammar(analyze_clause("This children run."))
        self.assertEqual((issue.code, issue.suggested), (IssueCode.DETERMINER_NUMBER, "these"))
