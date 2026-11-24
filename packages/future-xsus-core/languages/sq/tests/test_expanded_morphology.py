import unittest
from languages.sq.verbs import conjugate, analyze_verb
from languages.sq.nominals import decline, analyze_nominal
from languages.sq.pipeline import analyze_text

class ExpandedMorphologyTests(unittest.TestCase):
    def test_verbs(self):
        for lemma in ("lexoj", "mësoj", "krijoj", "ndërtoj", "zhvilloj", "shkruaj", "hap", "mbyll"):
            for tense in ("Pres", "Imp"):
                for person in (1, 2, 3):
                    for number in ("Sing", "Plur"):
                        form = conjugate(lemma, person=person, number=number, tense=tense)
                        self.assertTrue(any((a.lemma, a.person, a.number, a.tense) == (lemma, person, number, tense) for a in analyze_verb(form)))

    def test_nominals(self):
        for lemma in ("projekt", "aplikacion", "faqe", "detyrë", "kërkesë", "përgjigje"):
            for number in ("Sing", "Plur"):
                for case in ("Nom", "Acc"):
                    for definite in ("Ind", "Def"):
                        forms = decline(lemma, number=number, case=case, definite=definite)
                        self.assertTrue(forms)
                        for form in forms:
                            self.assertTrue(any((a.lemma, a.number, a.case, a.definite) == (lemma, number, case, definite) for a in analyze_nominal(form)))

    def test_ambiguity(self):
        self.assertEqual({a.person for a in analyze_verb("hap")}, {1, 2, 3})
        self.assertEqual({a.number for a in analyze_nominal("faqe")}, {"Sing", "Plur"})

    def test_pipeline(self):
        tokens = analyze_text("Unë krijoj aplikacionin.").tokens
        self.assertTrue(any(a.lemma == "krijoj" for a in tokens[1].verbs))
        self.assertTrue(any(a.lemma == "aplikacion" for a in tokens[2].nominals))
