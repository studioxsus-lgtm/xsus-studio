import unittest
from languages.sq.grammar import Agreement, Features, compare, subject_verb, noun_adjective

class GrammarTests(unittest.TestCase):
    def test_person_number(self):
        for person in (1, 2, 3):
            for number in ("singular", "plural"):
                f = Features(person=person, number=number)
                self.assertEqual(subject_verb(f, f), Agreement.MATCH)

    def test_person_conflict(self):
        self.assertEqual(subject_verb(Features(person=1), Features(person=2)), Agreement.MISMATCH)

    def test_number_conflict(self):
        self.assertEqual(subject_verb(Features(number="singular"), Features(number="plural")), Agreement.MISMATCH)

    def test_missing_evidence(self):
        self.assertEqual(subject_verb(Features(person=1), Features(person=1)), Agreement.UNKNOWN)

    def test_nominal_match(self):
        f = Features(gender="feminine", number="singular", case="nominative")
        self.assertEqual(noun_adjective(f, f), Agreement.MATCH)

    def test_gender_conflict(self):
        self.assertEqual(noun_adjective(Features(gender="masculine"), Features(gender="feminine")), Agreement.MISMATCH)

    def test_case_conflict(self):
        self.assertEqual(noun_adjective(Features(case="nominative"), Features(case="accusative")), Agreement.MISMATCH)

    def test_invalid_features(self):
        for kwargs in ({"person": True}, {"person": 4}, {"case": "invalid"}, {"number": "dual"}):
            with self.subTest(kwargs=kwargs), self.assertRaises(ValueError):
                Features(**kwargs)

    def test_invalid_dimensions(self):
        for dimensions in ((), ("invalid",)):
            with self.assertRaises(ValueError):
                compare(Features(), Features(), dimensions)
