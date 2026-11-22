import unittest
from services.api.intelligence_metrics_v1 import IntelligenceMetrics
from services.api.operational_alerts_v1 import evaluate_window

class OperationalAlertsTests(unittest.TestCase):
    def setUp(self):
        self.metrics=IntelligenceMetrics()
        self.before=self.metrics.snapshot()

    def evaluate(self):
        return evaluate_window(self.before,self.metrics.snapshot())

    def test_normal(self):
        for _ in range(100):
            self.metrics.observe(200,20)
        self.assertEqual(self.evaluate()["status"],"normal")

    def test_insufficient(self):
        self.metrics.observe(503,3000)
        self.assertEqual(self.evaluate()["status"],"insufficient_samples")

    def test_thresholds(self):
        for _ in range(95):
            self.metrics.observe(200,20)
        for _ in range(5):
            self.metrics.observe(503,3000)
        self.assertEqual({a.code for a in self.evaluate()["alerts"]},
                         {"server_error_rate","unavailable_rate"})

    def test_slow(self):
        for i in range(20):
            self.metrics.observe(200,501 if i<2 else 500)
        self.assertEqual([a.code for a in self.evaluate()["alerts"]],["slow_response_rate"])

    def test_reset(self):
        self.metrics.observe(200,5)
        self.assertEqual(evaluate_window(self.metrics.snapshot(),self.before)["status"],"counter_reset")

    def test_corruption(self):
        current=self.metrics.snapshot()
        current["completed_requests"]=1
        with self.assertRaises(ValueError):
            evaluate_window(self.before,current)

    def test_window_not_lifetime(self):
        for _ in range(100):
            self.metrics.observe(503,3000)
        self.before=self.metrics.snapshot()
        for _ in range(20):
            self.metrics.observe(200,5)
        self.assertEqual(self.evaluate()["status"],"normal")
