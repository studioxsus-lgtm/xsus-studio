"""CLI contract: required inputs, strict JSON, and no unrequested writes."""
import contextlib
import io
import json
import unittest
from unittest.mock import patch

from languages.en.evaluation.verified_checkpoint_holdout_cli_v1 import main


class VerifiedCheckpointHoldoutCliTests(unittest.TestCase):
    def test_cli_passes_explicit_corpora_to_evaluator(self):
        with patch(
            "languages.en.evaluation.verified_checkpoint_holdout_cli_v1.inspect_verified_checkpoint_holdout_v1",
            return_value={"cases": 2, "release_authorized": False},
        ) as evaluator:
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                report = main([
                    "--checkpoint", "checkpoint.gz",
                    "--evaluation", "holdout.jsonl",
                    "--training", "train-a.jsonl",
                    "--training", "train-b.jsonl",
                    "--max-new-tokens", "4",
                ])
        self.assertEqual(json.loads(output.getvalue()), report)
        args = evaluator.call_args
        self.assertEqual([str(path) for path in args.args[1]],
                         ["train-a.jsonl", "train-b.jsonl"])
        self.assertEqual(args.kwargs["max_new_tokens"], 4)

    def test_training_corpus_is_required(self):
        with contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit):
                main(["--checkpoint", "checkpoint.gz",
                      "--evaluation", "holdout.jsonl"])

    def test_evaluation_is_required(self):
        with contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit):
                main(["--checkpoint", "checkpoint.gz", "--training", "train.jsonl"])

    def test_nonfinite_json_output_is_rejected(self):
        with patch(
            "languages.en.evaluation.verified_checkpoint_holdout_cli_v1.inspect_verified_checkpoint_holdout_v1",
            return_value={"bad": float("nan")},
        ):
            with contextlib.redirect_stdout(io.StringIO()):
                with self.assertRaises(ValueError):
                    main(["--checkpoint", "checkpoint.gz",
                          "--evaluation", "holdout.jsonl",
                          "--training", "train.jsonl"])


if __name__ == "__main__":
    unittest.main()
