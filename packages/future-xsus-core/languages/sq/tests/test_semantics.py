import unittest
from languages.sq.semantics import analyze_semantics

class SemanticTests(unittest.TestCase):
    def test_create(self):
        frame, = analyze_semantics("Unë krijoj aplikacionin.")
        self.assertEqual((frame.actor, frame.action, frame.target), ("unë", "create", "application"))

    def test_build(self):
        frame, = analyze_semantics("Ne ndërtojmë projektin.")
        self.assertEqual((frame.action, frame.target), ("build", "project"))

    def test_negation(self):
        frame, = analyze_semantics("Unë nuk krijoj aplikacionin.")
        self.assertTrue(frame.negated)

    def test_question(self):
        frame, = analyze_semantics("A ti hap faqen?")
        self.assertTrue(frame.interrogative)

    def test_coordination(self):
        frames = analyze_semantics("Unë krijoj projektin dhe ti hap faqen.")
        self.assertEqual([f.action for f in frames], ["create", "open"])

    def test_unknown(self):
        for text in ("zzqx", "Unë jam.", "Unë krijojnë aplikacionin.", "Unë krijoj zzqx."):
            with self.subTest(text=text):
                self.assertEqual(analyze_semantics(text), ())

    def test_no_partial_result(self):
        self.assertEqual(analyze_semantics("Unë krijoj projektin dhe ti je."), ())
