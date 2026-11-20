import io
import json
import unittest
from contextlib import redirect_stdout, redirect_stderr
from languages.en.evaluation.cli_v6 import main

class CliV6Tests(unittest.TestCase):
    def run_cli(self, args):
        stdout, stderr = io.StringIO(), io.StringIO()
        with redirect_stdout(stdout), redirect_stderr(stderr):
            code = main(args)
        return code, stdout.getvalue(), stderr.getvalue()

    def test_analyze(self):
        code, output, error = self.run_cli(["analyze", "Why is it late?"])
        self.assertEqual(code, 0)
        self.assertEqual(error, "")
        self.assertEqual(json.loads(output)["intent"]["intent"], "question")

    def test_batch(self):
        code, output, _ = self.run_cli(["batch", "Hello.", ""])
        self.assertEqual(code, 0)
        self.assertEqual(json.loads(output)["failed"], 1)

    def test_benchmark(self):
        code, output, _ = self.run_cli(["benchmark", "Hello.", "--iterations", "2"])
        self.assertEqual(code, 0)
        self.assertEqual(json.loads(output)["total_items"], 2)

    def test_invalid_input(self):
        code, output, error = self.run_cli(["analyze", ""])
        self.assertEqual(code, 2)
        self.assertEqual(output, "")
        self.assertEqual(json.loads(error)["error"], "INVALID_INPUT")

    def test_invalid_iterations(self):
        code, _, error = self.run_cli(["benchmark", "Hello.", "--iterations", "0"])
        self.assertEqual(code, 2)
        self.assertEqual(json.loads(error)["error"], "INVALID_INPUT")
