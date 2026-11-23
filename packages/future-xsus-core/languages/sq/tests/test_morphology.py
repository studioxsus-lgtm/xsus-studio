import unittest
from languages.sq.morphology import analyze, inflect

class MorphologyTests(unittest.TestCase):
    def test_present_tense_jam(self):
        self.assertEqual(inflect("jam", Person="3", Number="Sing", Tense="Pres"), ("është",))

    def test_present_tense_kam(self):
        self.assertEqual(inflect("kam", Person="1", Number="Plur"), ("kemi",))

    def test_noun_definite(self):
        self.assertEqual(inflect("libër", Number="Sing", Definite="Def"), ("libri",))

    def test_reverse_analysis(self):
        self.assertEqual(analyze("LIBRAT")[0].lemma, "libër")
        self.assertIn("Number=Plur", analyze("LIBRAT")[0].features)

    def test_unknown_not_hallucinated(self):
        self.assertEqual(analyze("superfjalëepanjohur"), ())
        self.assertEqual(inflect("superfjalëepanjohur", Number="Plur"), ())

    def test_invalid_input(self):
        with self.assertRaises(TypeError):
            analyze(None)

if __name__ == "__main__":
    unittest.main()
