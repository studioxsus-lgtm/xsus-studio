import unittest
from languages.sq.verbs import conjugate, analyze_verb

class AlbanianVerbTests(unittest.TestCase):
    def test_present_irregular(self):
        self.assertEqual(conjugate("jam", person=3, number="Sing"), "është")
        self.assertEqual(conjugate("kam", person=3, number="Plur"), "kanë")

    def test_imperfect(self):
        self.assertEqual(conjugate("jam", person=1, number="Sing", tense="Imp"), "isha")
        self.assertEqual(conjugate("punoj", person=3, number="Plur", tense="Imp"), "punonin")

    def test_aorist(self):
        self.assertEqual(conjugate("kam", person=1, number="Plur", tense="Aor"), "patëm")

    def test_regular_present(self):
        self.assertEqual(conjugate("PUNOJ", person=1, number="Plur"), "punojmë")

    def test_ambiguous_form_retained(self):
        readings = analyze_verb("punon")
        self.assertEqual({item.person for item in readings}, {2, 3})

    def test_unknown_tense_not_invented(self):
        self.assertIsNone(conjugate("punoj", person=1, number="Sing", tense="Fut"))

    def test_unknown_lemma_not_invented(self):
        self.assertIsNone(conjugate("fluturoj", person=1, number="Sing"))
        self.assertEqual(analyze_verb("nukekziston"), ())

    def test_invalid_input(self):
        with self.assertRaises(ValueError):
            conjugate("jam", person=4, number="Sing")
        with self.assertRaises(TypeError):
            conjugate(None, person=1, number="Sing")

if __name__ == "__main__":
    unittest.main()
