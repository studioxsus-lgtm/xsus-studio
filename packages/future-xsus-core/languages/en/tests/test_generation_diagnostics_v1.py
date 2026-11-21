import unittest
from languages.en.evaluation.generation_diagnostics_v1 import summarize_generation_diagnostics_v1 as summarize


def row(text,accepted=False,exact=False):
    return {"generated":text,"accepted":accepted,"exact_match":exact}


class GenerationDiagnosticsV1Tests(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(summarize([])["cases"],0)

    def test_empty_mean(self):
        self.assertEqual(summarize([])["mean_response_length"],0.0)

    def test_empty_outputs(self):
        self.assertEqual(summarize([row(""),row(" ")])["empty_responses"],2)

    def test_distinct(self):
        self.assertEqual(summarize([row("Hello"),row("World")])["distinct_normalized_responses"],2)

    def test_normalized(self):
        self.assertEqual(summarize([row(" HELLO  "),row("hello")])["distinct_normalized_responses"],1)

    def test_repeated(self):
        self.assertEqual(summarize([row("same"),row("same"),row("different")])["most_common_response_count"],2)

    def test_identical(self):
        self.assertTrue(summarize([row("same"),row("same")])["all_responses_identical"])

    def test_one_not_identical(self):
        self.assertFalse(summarize([row("same")])["all_responses_identical"])

    def test_scores(self):
        self.assertEqual(summarize([row("x",True,True),row("y")])["accepted"],1)

    def test_exact(self):
        self.assertEqual(summarize([row("x",True,True),row("y")])["exact_matches"],1)

    def test_mean(self):
        self.assertEqual(summarize([row("a"),row("abc")])["mean_response_length"],2.0)

    def test_no_text_leak(self):
        self.assertNotIn("private answer",str(summarize([row("private answer")])))

    def test_contract(self):
        self.assertEqual(summarize([])["contract"],"future-xsus-core.generation-diagnostics.v1")

    def test_invalid_details(self):
        with self.assertRaises(ValueError):
            summarize("bad")

    def test_invalid_row(self):
        with self.assertRaises(ValueError):
            summarize([{"generated":None,"accepted":False,"exact_match":False}])

    def test_invalid_scores(self):
        with self.assertRaises(ValueError):
            summarize([{"generated":"hello","accepted":1,"exact_match":False}])
