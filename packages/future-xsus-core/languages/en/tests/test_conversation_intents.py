import json
import unittest
from pathlib import Path

from core.contracts.request import Conversation, ConversationRole, ConversationTurn
from languages.en.data.preparation.corpus import load_corpus, validate_splits
from languages.en.data.preparation.expand_corpus import build_v3_rows
from languages.en.evaluation.compare import load_cases
from languages.en.text.normalization.model_input import (
    CONVERSATION_V3, PLAIN, REWRITE_SLOTS, prepare_model_input,
)

LANGUAGE_ROOT = Path(__file__).resolve().parents[1]


class ConversationIntentTests(unittest.TestCase):
    def test_v3_corpus_is_reproducible_and_excludes_both_benchmarks(self):
        corpus = LANGUAGE_ROOT / "data" / "training-v3.jsonl"
        rows = [json.loads(line) for line in corpus.read_text(encoding="utf-8").splitlines()]
        self.assertEqual(rows, build_v3_rows(LANGUAGE_ROOT / "data" / "training.jsonl"))
        self.assertGreater(len(rows), len(load_corpus(LANGUAGE_ROOT / "data" / "training-v2.jsonl")))
        for version in ("v2", "v3"):
            cases = load_cases(LANGUAGE_ROOT / "evaluation" / f"quality-{version}.jsonl")
            validate_splits(load_corpus(corpus), tuple(case.example for case in cases))

    def test_greeting_thanks_and_note_request_have_distinct_prompts(self):
        for text, expected in (
            ("Hi there, are you ready to help?", "Greet the user."),
            ("Thanks for all the updates.", "Acknowledge the user's thanks."),
            ("Please draft a short thank-you note.", "Write a brief thank-you note."),
        ):
            with self.subTest(text=text):
                prompt, rewrite = prepare_model_input(Conversation(text), CONVERSATION_V3)
                self.assertEqual(prompt.text, expected)
                self.assertIsNone(rewrite)

    def test_clarification_targets_only_the_detected_missing_detail(self):
        for text, expected in (
            ("Clarify: We need the form soon.", "Ask for the deadline."),
            ("Clarify: We should talk at some point.", "Ask for the time."),
            ("Make this clearer: Let's meet at the usual spot.", "Ask for the location."),
            ("Clarify: Ask them to send it.", "Ask who should send what."),
        ):
            with self.subTest(text=text):
                self.assertEqual(prepare_model_input(Conversation(text), CONVERSATION_V3)[0].text, expected)
        ambiguous = Conversation("Clarify: Let's meet somewhere later.")
        self.assertEqual(prepare_model_input(ambiguous, CONVERSATION_V3), (ambiguous, None))

    def test_v3_rewrite_alias_preserves_unnamed_details_and_previous_formats(self):
        conversation = Conversation("Soften this request: We need the receipt by Friday at 9 a.m.")
        self.assertEqual(prepare_model_input(conversation, PLAIN), (conversation, None))
        self.assertEqual(prepare_model_input(conversation, REWRITE_SLOTS), (conversation, None))
        prompt, rewrite = prepare_model_input(conversation, CONVERSATION_V3)
        self.assertEqual(prompt.text, "Make this warmer: We need [[ITEM]] by [[WHEN]].")
        self.assertEqual(
            rewrite.restore("We would appreciate receiving [[ITEM]] by [[WHEN]]."),
            "We would appreciate receiving the receipt by Friday at 9 a.m.",
        )

    def test_follow_up_uses_previous_assistant_reply(self):
        history = (ConversationTurn(
            ConversationRole.ASSISTANT, "We would appreciate receiving the receipt by Friday at 9 a.m."
        ),)
        conversation = Conversation("Can you say it in fewer words?", history)
        _, rewrite = prepare_model_input(conversation, CONVERSATION_V3)
        self.assertEqual(
            rewrite.restore("Please send [[ITEM]] by [[WHEN]]."), "Please send the receipt by Friday at 9 a.m."
        )
