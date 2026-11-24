import unittest
from languages.sq.text import lookup, detect_language
from languages.sq.lexicon import LEXICON

class LexiconTests(unittest.TestCase):
    def test_inventory(self):
        self.assertGreaterEqual(len(LEXICON), 200)
        for word, tag in LEXICON.items():
            self.assertEqual(lookup(word.upper()), tag)

    def test_technical_vocabulary(self):
        for word in ("aplikacion", "ndërfaqe", "bërthamë", "algoritëm"):
            self.assertEqual(lookup(word), "NOUN")

    def test_unknown(self):
        self.assertIsNone(lookup("zzqxunknown"))

    def test_detection_unchanged(self):
        self.assertIsNone(detect_language("server"))
        self.assertEqual(detect_language("Krijoj një aplikacion në shqip"), "sq")
