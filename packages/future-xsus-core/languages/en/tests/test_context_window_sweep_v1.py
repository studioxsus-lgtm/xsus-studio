import unittest
from core.contracts.request import Conversation
from languages.en.text.tokenizer import BytePairTokenizer
from languages.en.evaluation.context_window_sweep_v1 import inspect_context_window_sweep_v1 as inspect


class ContextWindowSweepTests(unittest.TestCase):
    def setUp(self):
        self.tokenizer=BytePairTokenizer()
        self.conversations=[Conversation("Identify synthetic marker 0 without repeating the prompt."),
                            Conversation("Identify synthetic marker 1 without repeating the prompt.")]

    def test_default_windows(self):
        self.assertEqual(set(inspect(self.tokenizer,"plain",self.conversations)["window_results"]),{"16","32","64","128"})

    def test_small_window_collides(self):
        self.assertTrue(inspect(self.tokenizer,"plain",self.conversations)["window_results"]["16"]["all_context_windows_identical"])

    def test_large_window_distinguishes(self):
        self.assertEqual(inspect(self.tokenizer,"plain",self.conversations)["window_results"]["128"]["distinct_context_windows"],2)

    def test_full_prompts_distinct(self):
        self.assertEqual(inspect(self.tokenizer,"plain",self.conversations)["distinct_full_prompts"],2)

    def test_minimum_tested_collision_free(self):
        row=inspect(self.tokenizer,"plain",self.conversations)
        self.assertIn(row["smallest_tested_collision_free_window"],(32,64,128))

    def test_duplicate_inputs(self):
        row=inspect(self.tokenizer,"plain",[self.conversations[0]]*2)
        self.assertIsNone(row["smallest_tested_collision_free_window"])

    def test_collision_count(self):
        row=inspect(self.tokenizer,"plain",self.conversations)
        self.assertEqual(row["window_results"]["16"]["colliding_cases"],2)

    def test_largest_group(self):
        row=inspect(self.tokenizer,"plain",self.conversations)
        self.assertEqual(row["window_results"]["16"]["largest_collision_group"],2)

    def test_custom_windows(self):
        row=inspect(self.tokenizer,"plain",self.conversations,windows=(8,128))
        self.assertEqual(set(row["window_results"]),{"8","128"})

    def test_no_production_change(self):
        self.assertFalse(inspect(self.tokenizer,"plain",self.conversations)["production_context_changed"])

    def test_no_raw_text(self):
        self.assertFalse(inspect(self.tokenizer,"plain",self.conversations)["raw_text_exposed"])

    def test_no_raw_ids(self):
        self.assertFalse(inspect(self.tokenizer,"plain",self.conversations)["raw_token_ids_exposed"])

    def test_no_release(self):
        self.assertFalse(inspect(self.tokenizer,"plain",self.conversations)["release_authorized"])

    def test_invalid_empty(self):
        with self.assertRaises(ValueError):
            inspect(self.tokenizer,"plain",self.conversations[:1])

    def test_invalid_window(self):
        with self.assertRaises(ValueError):
            inspect(self.tokenizer,"plain",self.conversations,windows=(0,))

    def test_duplicate_window(self):
        with self.assertRaises(ValueError):
            inspect(self.tokenizer,"plain",self.conversations,windows=(16,16))

    def test_contract(self):
        self.assertEqual(inspect(self.tokenizer,"plain",self.conversations)["contract"],"future-xsus-core.context-window-sweep.v1")
