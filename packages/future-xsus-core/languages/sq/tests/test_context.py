import unittest
from languages.sq.context import Context, analyze_turn

class ContextTests(unittest.TestCase):
    def test_explicit_target(self):
        result = analyze_turn("Unë krijoj projektin.")
        self.assertEqual(result.context.target, "project")

    def test_candidate_not_resolution(self):
        first = analyze_turn("Unë krijoj projektin.")
        second = analyze_turn("Unë hap.", first.context)
        self.assertEqual(second.candidate_target, "project")
        self.assertIsNone(second.frames[0].target)

    def test_isolation(self):
        analyze_turn("Unë krijoj projektin.")
        self.assertIsNone(analyze_turn("Unë hap.").candidate_target)

    def test_expiration(self):
        context = Context("project")
        for _ in range(3):
            context = analyze_turn("zzqx", context).context
        self.assertIsNone(context.target)

    def test_negation_does_not_replace(self):
        result = analyze_turn("Unë nuk krijoj aplikacionin.", Context("project"))
        self.assertEqual(result.context.target, "project")

    def test_question_does_not_replace(self):
        result = analyze_turn("A ti hap faqen?", Context("project"))
        self.assertEqual(result.context.target, "project")

    def test_ambiguous_targets(self):
        result = analyze_turn("Unë krijoj projektin dhe ti hap faqen.", Context("book"))
        self.assertIsNone(result.context.target)

    def test_explicit_replacement(self):
        result = analyze_turn("Unë hap faqen.", Context("project"))
        self.assertEqual(result.context.target, "page")
