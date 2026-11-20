import json
import unittest
from languages.en.learning.language_scope_v1 import (
    LanguageLearningProposalV1, assess_language_learning_scope_v1,
)


def proposal(domain="grammar", language="en", source="consented_feedback", approved=True):
    return LanguageLearningProposalV1(language, domain, source, approved)


class LanguageScopeV1Tests(unittest.TestCase):
    def test_grammar_accepted(self):
        self.assertTrue(assess_language_learning_scope_v1(proposal())["accepted_for_candidate_preflight"])

    def test_morphology_accepted(self):
        self.assertTrue(assess_language_learning_scope_v1(proposal("morphology"))["accepted_for_candidate_preflight"])

    def test_syntax_accepted(self):
        self.assertTrue(assess_language_learning_scope_v1(proposal("syntax"))["accepted_for_candidate_preflight"])

    def test_vocabulary_accepted(self):
        self.assertTrue(assess_language_learning_scope_v1(proposal("vocabulary"))["accepted_for_candidate_preflight"])

    def test_orthography_accepted(self):
        self.assertTrue(assess_language_learning_scope_v1(proposal("orthography"))["accepted_for_candidate_preflight"])

    def test_punctuation_accepted(self):
        self.assertTrue(assess_language_learning_scope_v1(proposal("punctuation"))["accepted_for_candidate_preflight"])

    def test_usage_accepted(self):
        self.assertTrue(assess_language_learning_scope_v1(proposal("language_usage"))["accepted_for_candidate_preflight"])

    def test_curated_corpus_accepted(self):
        self.assertTrue(assess_language_learning_scope_v1(proposal(source="curated_corpus"))["accepted_for_candidate_preflight"])

    def test_programming_rejected(self):
        self.assertIn("learning_domain_out_of_scope", assess_language_learning_scope_v1(proposal("programming"))["reasons"])

    def test_general_knowledge_rejected(self):
        self.assertFalse(assess_language_learning_scope_v1(proposal("general_knowledge"))["accepted_for_candidate_preflight"])

    def test_world_facts_rejected(self):
        self.assertFalse(assess_language_learning_scope_v1(proposal("world_facts"))["accepted_for_candidate_preflight"])

    def test_unenabled_albanian_rejected(self):
        self.assertIn("language_engine_not_enabled", assess_language_learning_scope_v1(proposal(language="sq"))["reasons"])

    def test_unenabled_french_rejected(self):
        self.assertFalse(assess_language_learning_scope_v1(proposal(language="fr"))["accepted_for_candidate_preflight"])

    def test_unapproved_source_rejected(self):
        self.assertIn("source_not_approved", assess_language_learning_scope_v1(proposal(source="unreviewed_web"))["reasons"])

    def test_unapproved_feedback_rejected(self):
        self.assertIn("human_review_required", assess_language_learning_scope_v1(proposal(approved=False))["reasons"])

    def test_multiple_failures(self):
        self.assertEqual(len(assess_language_learning_scope_v1(
            proposal("programming", "fr", "unreviewed_web", False))["reasons"]), 4)

    def test_invalid_object(self):
        with self.assertRaises(ValueError):
            assess_language_learning_scope_v1({})

    def test_boolean_as_domain_rejected(self):
        with self.assertRaises(ValueError):
            assess_language_learning_scope_v1(proposal(domain=True))

    def test_approval_must_be_boolean(self):
        with self.assertRaises(ValueError):
            assess_language_learning_scope_v1(proposal(approved=1))

    def test_case_sensitive_fail_closed(self):
        self.assertFalse(assess_language_learning_scope_v1(proposal("Grammar"))["accepted_for_candidate_preflight"])

    def test_deterministic(self):
        self.assertEqual(assess_language_learning_scope_v1(proposal()), assess_language_learning_scope_v1(proposal()))

    def test_json_serializable(self):
        json.dumps(assess_language_learning_scope_v1(proposal()))

    def test_no_production_authorization(self):
        self.assertFalse(assess_language_learning_scope_v1(proposal())["production_activation_authorized"])

    def test_no_semantic_verification_claim(self):
        self.assertFalse(assess_language_learning_scope_v1(proposal())["semantic_content_verified"])

    def test_no_code_modification(self):
        self.assertFalse(assess_language_learning_scope_v1(proposal())["self_modifying_code_authorized"])
