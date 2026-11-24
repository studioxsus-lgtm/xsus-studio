import unittest
from languages.sq.spelling import check_word

class SpellingTests(unittest.TestCase):
    def test_diacritics(self):
        for source, expected in (("gjuhe", "gjuhë"), ("shtepi", "shtëpi"), ("cmim", "çmim"), ("nderfaqe", "ndërfaqe")):
            with self.subTest(source=source):
                result = check_word(source)
                self.assertEqual(result.status, "suggestion")
                self.assertIn(expected, result.suggestions)
                self.assertEqual(result.original, source)

    def test_known(self):
        for word in ("gjuhë", "aplikacion", "krijojmë", "projektin"):
            self.assertEqual(check_word(word).status, "known")

    def test_protected(self):
        for word in ("XSUS", "api", "JavaScript", "user_id", "app.js", "https://example.com", "123", "myVariable"):
            self.assertEqual(check_word(word).status, "protected")

    def test_unknown(self):
        self.assertEqual(check_word("zzqxunknown").status, "unknown")
        self.assertEqual(check_word("zzqxunknown").suggestions, ())

    def test_invalid(self):
        with self.assertRaises(TypeError):
            check_word(None)

    def test_bound(self):
        self.assertEqual(check_word("a" * 129).status, "protected")

    def test_unicode(self):
        self.assertEqual(check_word("gjuhe\u0308").status, "known")
