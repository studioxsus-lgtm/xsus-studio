import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from dataclasses import replace
from languages.en.learning.autonomous_candidate_cycle_v1 import (
    CandidateCycleRequestV1 as Request,
    plan_autonomous_candidate_cycle_v1 as plan,
    execute_autonomous_candidate_cycle_v1 as execute,
)
from languages.en.learning.feedback_store import SQLiteFeedbackStore
from languages.en.data.preparation.corpus import Example


class AutonomousCandidateCycleV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)
        self.store=SQLiteFeedbackStore(self.root/"feedback.sqlite")
        self.request=Request(
            "owner","grammar",self.root/"baseline.json",
            self.root/"train.jsonl",
            {"written-v4":self.root/"v4.jsonl","written-v5":self.root/"v5.jsonl"},
            self.root/"candidate.json",self.root/"report.json")
        for i in range(5):
            record=self.store.submit("owner",Example(f"Example {i}?",f"Answer {i}."),consent=True)
            self.store.review("owner",record.example_id,approved=True)

    def test_plan(self):
        self.assertEqual(plan(self.store,self.request)["approved_example_count"],5)

    def test_no_training(self):
        self.assertFalse(plan(self.store,self.request)["training_started"])

    def test_no_activation(self):
        self.assertFalse(plan(self.store,self.request)["automatic_activation_authorized"])

    def test_release_required(self):
        self.assertTrue(plan(self.store,self.request)["human_release_required"])

    def test_feedback_revision(self):
        self.assertEqual(len(plan(self.store,self.request)["feedback_revision"]),64)

    def test_benchmarks(self):
        self.assertEqual(plan(self.store,self.request)["benchmarks"],("written-v4","written-v5"))

    def test_no_semantic_claim(self):
        self.assertFalse(plan(self.store,self.request)["semantic_correctness_independently_verified"])

    def test_no_execution_without_approval(self):
        with self.assertRaises(PermissionError):
            execute(self.store,self.request)

    def test_no_execution_with_false(self):
        with self.assertRaises(PermissionError):
            execute(self.store,self.request,approved_execution=False)

    def test_no_execution_with_truthy_non_boolean(self):
        with self.assertRaises(PermissionError):
            execute(self.store,self.request,approved_execution=1)

    def test_wrong_store(self):
        with self.assertRaises(ValueError):
            plan(None,self.request)

    def test_wrong_request(self):
        with self.assertRaises(ValueError):
            plan(self.store,None)

    def test_wrong_owner(self):
        with self.assertRaises(ValueError):
            plan(self.store,replace(self.request,owner_id=""))

    def test_wrong_domain(self):
        with self.assertRaises(ValueError):
            plan(self.store,replace(self.request,domain=""))

    def test_wrong_benchmarks(self):
        with self.assertRaises(ValueError):
            plan(self.store,replace(self.request,evaluation_paths={"written-v4":self.root/"v4"}))

    def test_duplicate_paths(self):
        with self.assertRaises(ValueError):
            plan(self.store,replace(self.request,candidate_path=self.request.baseline_path))

    def test_feedback_store_collision(self):
        with self.assertRaises(ValueError):
            plan(self.store,replace(self.request,candidate_path=self.store.path))

    def test_bad_epoch(self):
        with self.assertRaises(ValueError):
            plan(self.store,replace(self.request,epochs=0))

    def test_bad_replay(self):
        with self.assertRaises(ValueError):
            plan(self.store,replace(self.request,replay_examples=0))

    def test_bad_rate(self):
        with self.assertRaises(ValueError):
            plan(self.store,replace(self.request,learning_rate=float("nan")))

    def test_boolean_rate(self):
        with self.assertRaises(ValueError):
            plan(self.store,replace(self.request,learning_rate=True))

    def test_boolean_seed(self):
        with self.assertRaises(ValueError):
            plan(self.store,replace(self.request,seed=True))

    def test_too_few_examples(self):
        with self.assertRaises(ValueError):
            plan(self.store,replace(self.request,owner_id="other"))

    def test_execute_mocked_candidate(self):
        expected=plan(self.store,self.request)["feedback_revision"]
        report={"format":"xsus-en-learning-report-v1",
                "input_sha256":{"approved_feedback_set":expected},
                "eligible_for_promotion":True}
        with patch("languages.en.learning.autonomous_candidate_cycle_v1.build_candidate",return_value=report) as build:
            result=execute(self.store,self.request,approved_execution=True)
        self.assertTrue(build.called)
        self.assertTrue(result["candidate_eligible_for_review"])
        self.assertFalse(result["production_deployed"])

    def test_changed_feedback_rejected(self):
        with patch("languages.en.learning.autonomous_candidate_cycle_v1.build_candidate",
                   return_value={"format":"xsus-en-learning-report-v1",
                                 "input_sha256":{"approved_feedback_set":"0"*64}}):
            with self.assertRaises(ValueError):
                execute(self.store,self.request,approved_execution=True)

    def test_bad_report_rejected(self):
        with patch("languages.en.learning.autonomous_candidate_cycle_v1.build_candidate",return_value={}):
            with self.assertRaises(ValueError):
                execute(self.store,self.request,approved_execution=True)
