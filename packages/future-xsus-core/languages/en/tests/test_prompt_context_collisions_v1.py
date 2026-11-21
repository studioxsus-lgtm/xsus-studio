import unittest
from core.contracts.request import Conversation
from languages.en.text.tokenizer import BytePairTokenizer
from languages.en.evaluation.prompt_context_collisions_v1 import inspect_prompt_context_collisions_v1 as inspect


class Model:
    context_size=4
    prompt_format="plain"


class PromptContextCollisionsTests(unittest.TestCase):
    def setUp(self):
        self.tokenizer=BytePairTokenizer()
        self.model=Model()

    def test_same_suffix_collision(self):
        result=inspect(self.tokenizer,self.model,[Conversation("Alpha identical suffix"),Conversation("Bravo identical suffix")])
        self.assertTrue(result["context_collision_detected"])

    def test_full_prompts_distinct(self):
        result=inspect(self.tokenizer,self.model,[Conversation("Alpha identical suffix"),Conversation("Bravo identical suffix")])
        self.assertEqual(result["distinct_full_prompts"],2)

    def test_same_suffix_window_identical(self):
        result=inspect(self.tokenizer,self.model,[Conversation("Alpha identical suffix"),Conversation("Bravo identical suffix")])
        self.assertTrue(result["all_context_windows_identical"])

    def test_collision_count(self):
        result=inspect(self.tokenizer,self.model,[Conversation("Alpha identical suffix"),Conversation("Bravo identical suffix")])
        self.assertEqual(result["colliding_cases"],2)

    def test_distinct_suffix(self):
        result=inspect(self.tokenizer,self.model,[Conversation("Alpha ending X"),Conversation("Bravo ending Y")])
        self.assertEqual(result["distinct_context_windows"],2)

    def test_largest_group(self):
        result=inspect(self.tokenizer,self.model,[Conversation("Alpha identical suffix"),Conversation("Bravo identical suffix")])
        self.assertEqual(result["largest_collision_group"],2)

    def test_no_raw_text(self):
        self.assertFalse(inspect(self.tokenizer,self.model,[Conversation("A"),Conversation("B")])["raw_text_exposed"])

    def test_no_raw_ids(self):
        self.assertFalse(inspect(self.tokenizer,self.model,[Conversation("A"),Conversation("B")])["raw_token_ids_exposed"])

    def test_no_context(self):
        self.assertFalse(inspect(self.tokenizer,self.model,[Conversation("A"),Conversation("B")])["raw_context_exposed"])

    def test_no_release(self):
        self.assertFalse(inspect(self.tokenizer,self.model,[Conversation("A"),Conversation("B")])["release_authorized"])

    def test_bad_case_count(self):
        with self.assertRaises(ValueError):
            inspect(self.tokenizer,self.model,[Conversation("A")])

    def test_bad_context(self):
        self.model.context_size=0
        with self.assertRaises(ValueError):
            inspect(self.tokenizer,self.model,[Conversation("A"),Conversation("B")])

    def test_contract(self):
        self.assertEqual(inspect(self.tokenizer,self.model,[Conversation("A"),Conversation("B")])["contract"],"future-xsus-core.prompt-context-collisions.v1")
