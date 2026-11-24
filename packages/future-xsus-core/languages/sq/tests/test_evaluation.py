import unittest
from languages.sq.evaluation import EvaluationCase, evaluate
from languages.sq.technical_requests import TechnicalRequest

class EvaluationTests(unittest.TestCase):
    def test_supported_and_unsupported(self):
        cases = (
            EvaluationCase("Zhvillo aplikacion Android.", TechnicalRequest("create", "application", "android")),
            EvaluationCase("Ndërto aplikacion iOS", TechnicalRequest("create", "application", "ios")),
            EvaluationCase("Krijo një bazë të dhënash", TechnicalRequest("create", "database")),
            EvaluationCase("Shto sistemin e pagesave", TechnicalRequest("add", "application", feature="payments")),
            EvaluationCase("Mos ndërto aplikacion Android", None),
            EvaluationCase("A mund të krijosh një aplikacion?", None),
            EvaluationCase("Krijo aplikacion Android dhe iOS", None),
            EvaluationCase("Fshi projektin", None),
        )
        report = evaluate(cases)
        self.assertEqual(report.total, 8)
        self.assertEqual(report.correct, 8)
        self.assertEqual(report.accuracy, 1.0)

    def test_error_categories(self):
        report = evaluate((
            EvaluationCase("Krijo aplikacion", None),
            EvaluationCase("Ndërto një lojë", TechnicalRequest("create", "game")),
            EvaluationCase("Krijo aplikacion Android", TechnicalRequest("create", "application", "ios")),
        ))
        self.assertEqual((report.false_accepts, report.false_rejects, report.wrong_intents), (1, 1, 1))
        self.assertEqual(report.accuracy, 0.0)

    def test_empty(self):
        self.assertIsNone(evaluate(()).accuracy)
