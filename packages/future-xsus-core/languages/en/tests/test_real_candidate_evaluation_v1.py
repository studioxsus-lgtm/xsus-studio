"""Real training and real benchmark evaluation on isolated small holdouts."""
import json
import tempfile
import unittest
from pathlib import Path

from core.contracts.request import Conversation
from languages.en.data.preparation.corpus import Example
from languages.en.learning.feedback_store import SQLiteFeedbackStore
from languages.en.learning.autonomous_candidate_cycle_v1 import (
    CandidateCycleRequestV1, execute_autonomous_candidate_cycle_v1,
)
from languages.en.learning.candidate_cycle_journal_v1 import inspect_candidate_cycle_journal_v1
from languages.en.models.checkpoint import save_checkpoint
from languages.en.models.neural_model import NeuralLanguageModel
from languages.en.text.tokenizer import BytePairTokenizer


class RealCandidateEvaluationV1Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory()
        cls.root=Path(cls.temp.name)
        root=cls.root
        cls.store=SQLiteFeedbackStore(root/"feedback.sqlite3")
        train=root/"training.jsonl"
        train.write_text("".join(json.dumps({
            "prompt":f"Curated training request {i}",
            "response":f"Curated answer {i}."})+"\\n" for i in range(6)),encoding="utf-8")
        for i in range(5):
            record=cls.store.submit("owner-a",Example(
                Conversation(f"Reviewed private question {i}"),
                f"Approved private answer {i}."),consent=True)
            cls.store.review("owner-a",record.example_id,approved=True)
        tokenizer=BytePairTokenizer()
        model=NeuralLanguageModel.initialize(
            vocab_size=tokenizer.vocab_size,hidden_size=4,context_size=16,seed=17)
        baseline=root/"baseline.json.gz"
        save_checkpoint(baseline,tokenizer,model)
        paths={}
        for version in ("written-v4","written-v5"):
            path=root/(version+".jsonl")
            row={"id":version+"-isolated","prompt":"Explain a neutral writing topic for "+version+".",
                 "response":"This is an independent reference.",
                 "facts":[],"patterns":["this is an independent reference\\."]}
            path.write_text(json.dumps(row)+"\\n",encoding="utf-8")
            paths[version]=path
        cls.request=CandidateCycleRequestV1(
            "owner-a","grammar",baseline,train,paths,
            root/"candidate.json.gz",root/"report.json",
            epochs=1,replay_examples=2)
        # No mocking: build_candidate loads and evaluates both benchmark files.
        cls.result=execute_autonomous_candidate_cycle_v1(
            cls.store,cls.request,approved_execution=True)
        cls.report=cls.result["candidate_report"]

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def test_candidate_created(self):
        self.assertTrue(self.request.candidate_path.is_file())

    def test_real_benchmark_v4(self):
        self.assertEqual(self.report["benchmarks"]["written-v4"]["baseline"]["cases"],1)

    def test_real_benchmark_v5(self):
        self.assertEqual(self.report["benchmarks"]["written-v5"]["candidate"]["cases"],1)

    def test_v4_has_real_generated_details(self):
        self.assertEqual(len(self.report["benchmarks"]["written-v4"]["candidate"]["details"]),1)

    def test_v5_has_real_generated_details(self):
        self.assertEqual(len(self.report["benchmarks"]["written-v5"]["candidate"]["details"]),1)

    def test_model_revision_changes(self):
        self.assertNotEqual(self.report["baseline_revision"],self.report["candidate_revision"])

    def test_feedback_loss_before(self):
        self.assertIsInstance(self.report["feedback_loss_before"],float)

    def test_feedback_loss_after(self):
        self.assertIsInstance(self.report["feedback_loss_after"],float)

    def test_eligibility_is_measured_boolean(self):
        self.assertIs(type(self.report["eligible_for_promotion"]),bool)

    def test_benchmark_regressions_are_not_hidden(self):
        for name in ("written-v4","written-v5"):
            scores=self.report["benchmarks"][name]
            self.assertIn("accepted",scores["baseline"])
            self.assertIn("accepted",scores["candidate"])

    def test_completed_journal(self):
        self.assertEqual(inspect_candidate_cycle_journal_v1(self.request.report_path).state,"completed")

    def test_no_deployment(self):
        self.assertFalse(self.result["production_deployed"])
