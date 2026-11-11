import json
import unittest
from pathlib import Path

from core.contracts.request import Conversation, ConversationRole, ConversationTurn
from languages.en.data.preparation.corpus import load_corpus, validate_splits
from languages.en.data.preparation.expand_corpus import build_rows
from languages.en.evaluation.compare import load_cases
from languages.en.text.normalization.rewrite_slots import prepare_rewrite

LANGUAGE_ROOT = Path(__file__).resolve().parents[1]


class EnglishQualityTests(unittest.TestCase):
    def setUp(self):
        self.cases = load_cases(LANGUAGE_ROOT / "evaluation" / "quality-v2.jsonl")
        self.by_id = {case.identifier: case for case in self.cases}

    def test_expanded_corpus_is_reproducible_and_held_out_cases_are_disjoint(self):
        baseline = LANGUAGE_ROOT / "data" / "training.jsonl"
        expanded = LANGUAGE_ROOT / "data" / "training-v2.jsonl"
        rows = [json.loads(line) for line in expanded.read_text(encoding="utf-8").splitlines()]
        self.assertEqual(rows, build_rows(baseline))
        training = load_corpus(expanded)
        self.assertGreater(len(training), len(load_corpus(baseline)))
        validate_splits(training, tuple(case.example for case in self.cases))

    def test_accepts_a_valid_paraphrase_and_flags_wrong_deadline(self):
        case = self.by_id["polite-unseen-phrase"]
        alternate = case.score("Would you please send me the revised draft by Thursday at 3 p.m.?")
        self.assertTrue(alternate["accepted"])
        self.assertFalse(alternate["exact_match"])
        wrong = case.score("Would you please send me the revised draft by Thursday at 8 p.m.?")
        self.assertFalse(wrong["accepted"])
        self.assertEqual(wrong["missing_facts"], ["Thursday at 3 p.m."])

    def test_number_aliases_work_without_accepting_a_larger_count(self):
        case = self.by_id["count-unseen-combination"]
        self.assertTrue(case.score("Could you please bring five folders?")["accepted"])
        wrong = case.score("Could you please bring 15 folders?")
        self.assertFalse(wrong["accepted"])
        self.assertEqual(wrong["missing_facts"], ["5"])

    def test_all_facts_are_insufficient_when_output_does_not_follow_instruction(self):
        case = self.by_id["warmer-unseen-combination"]
        result = case.score("Maya, budget, Friday at noon.")
        self.assertEqual(result["missing_facts"], [])
        self.assertFalse(result["accepted"])

    def test_rewrite_restores_new_name_document_and_deadline(self):
        prepared = prepare_rewrite(Conversation("Make this polite: Jamie, send the invoice by Sunday at 4:30 p.m."))
        self.assertIsNotNone(prepared)
        target = "[[NAME]], could you please send [[ITEM]] by [[WHEN]]?"
        result = "Jamie, could you please send the invoice by Sunday at 4:30 p.m.?"
        self.assertEqual(prepared.mask(result), target)
        self.assertEqual(prepared.restore(target), result)
        self.assertEqual(prepared.restore("Please send [[ITEM]] sometime."), "")
        self.assertEqual(prepared.restore(target + " [[NAME]]"), "")

    def test_follow_up_restores_details_from_previous_reply(self):
        history = (ConversationTurn(
            ConversationRole.ASSISTANT, "Jamie, could you please send the invoice by Sunday at 4:30 p.m.?"
        ),)
        prepared = prepare_rewrite(Conversation("Make it shorter.", history))
        self.assertIsNotNone(prepared)
        self.assertEqual(
            prepared.restore("[[NAME]], please send [[ITEM]] by [[WHEN]]."),
            "Jamie, please send the invoice by Sunday at 4:30 p.m.",
        )
        self.assertIsNone(prepare_rewrite(Conversation("Don't make this polite: Jamie, send the invoice by Sunday.")))
