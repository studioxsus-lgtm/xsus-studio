import unittest
from languages.sq.nominals import analyze_nominal, decline

class AlbanianNominalTests(unittest.TestCase):
    def test_masculine_noun(self):
        self.assertEqual(decline("libër", number="Sing", definite="Def"), ("libri",))

    def test_feminine_noun(self):
        self.assertEqual(decline("shkollë", number="Sing", definite="Def"), ("shkolla",))

    def test_plural_definite(self):
        self.assertEqual(decline("libër", number="Plur", definite="Def"), ("librat",))

    def test_accusative(self):
        self.assertEqual(decline("shkollë", number="Sing", case="Acc", definite="Def"), ("shkollën",))

    def test_pronouns(self):
        self.assertEqual(decline("unë", number="Sing", case="Acc"), ("mua",))
        self.assertEqual(decline("ti", number="Sing", case="Acc"), ("ty",))

    def test_ambiguity_retained(self):
        analyses = analyze_nominal("shkolla")
        self.assertEqual({a.number for a in analyses}, {"Sing", "Plur"})

    def test_gender(self):
        self.assertEqual(analyze_nominal("libri")[0].gender, "Masc")
        self.assertEqual(analyze_nominal("shkolla")[0].gender, "Fem")

    def test_unknown_no_guess(self):
        self.assertEqual(analyze_nominal("fjaleepanjohur"), ())
        self.assertEqual(decline("fjaleepanjohur", number="Plur"), ())

    def test_unsupported_case(self):
        self.assertEqual(decline("libër", number="Sing", case="Gen"), ())

    def test_invalid_input(self):
        with self.assertRaises(TypeError):
            analyze_nominal(None)
        with self.assertRaises(ValueError):
            decline("libër", number="Invalid")

if __name__ == "__main__":
    unittest.main()
