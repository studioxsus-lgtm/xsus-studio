import unittest
from languages.sq.technical_lexicon import TERMS, lookup_technical_term

class TechnicalLexiconTests(unittest.TestCase):
    def test_registry(self):
        self.assertEqual(len(TERMS), 62)
        self.assertEqual(len({v.category for v in TERMS.values()}), 7)

    def test_alias(self):
        self.assertEqual(lookup_technical_term("Databazë"), lookup_technical_term("  BAZË  TË DHËNASH "))

    def test_categories(self):
        for term, category in (("buton","interface"), ("kriptim","security"), ("tipografi","design"), ("android","platform"), ("testim","development"), ("njoftime","features")):
            self.assertEqual(lookup_technical_term(term).category, category)

    def test_unknown(self):
        for term in ("", "zzqx", "mos krijo databazë", "a"*257):
            self.assertIsNone(lookup_technical_term(term))

    def test_immutable(self):
        with self.assertRaises(TypeError):
            TERMS["new"] = None
