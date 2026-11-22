import json
import unittest
from concurrent.futures import ThreadPoolExecutor
from aiohttp.test_utils import TestClient, TestServer
from services.api.app import create_app, INTELLIGENCE_METRICS
from services.api.intelligence_metrics_v1 import IntelligenceMetrics


class MetricsTests(unittest.TestCase):
    def test_concurrent_accounting(self):
        metrics = IntelligenceMetrics()
        with ThreadPoolExecutor(max_workers=8) as workers:
            list(workers.map(lambda _: metrics.observe(200, 10), range(1000)))
        report = metrics.snapshot()
        self.assertEqual(report["completed_requests"], 1000)
        self.assertEqual(report["status_classes"]["2xx"], 1000)
        self.assertEqual(sum(report["latency_bucket_counts"]), 1000)

    def test_snapshot_isolated(self):
        metrics = IntelligenceMetrics()
        metrics.observe(503, 2500)
        metrics.observe(None, 5)
        report = metrics.snapshot()
        self.assertEqual(report["unavailable_responses"], 1)
        self.assertEqual(report["status_classes"]["cancelled"], 1)
        self.assertEqual(report["latency_bucket_counts"], [1, 0, 0, 0, 0, 1])
        report["status_classes"]["5xx"] = 100
        self.assertEqual(metrics.snapshot()["status_classes"]["5xx"], 1)


class HTTPMetricsTests(unittest.IsolatedAsyncioTestCase):
    async def test_observes_http_without_private_data(self):
        app = create_app(store=None, conversation=None,
                         owner_tokens={"alice": "private-token"}, intelligence_enabled=True)
        async with TestClient(TestServer(app)) as client:
            path = "/v1/intelligence/reason"
            payload = {"contractVersion": "1.0.0", "requestId": "private-id",
                       "query": "private_fact", "facts": ["private_fact"], "rules": []}
            response = await client.post(path, json=payload,
                           headers={"Authorization": "Bearer private-token"})
            self.assertEqual(response.status, 200)
            response = await client.post(path, json=payload)
            self.assertEqual(response.status, 401)
            report = app[INTELLIGENCE_METRICS].snapshot()
            self.assertEqual(report["completed_requests"], 2)
            self.assertEqual(report["status_classes"]["2xx"], 1)
            self.assertEqual(report["status_classes"]["4xx"], 1)
            serialized = json.dumps(report)
            for secret in ("private-token", "private_fact", "private-id", "alice"):
                self.assertNotIn(secret, serialized)
            self.assertEqual((await client.get("/healthz")).status, 200)
            self.assertEqual(app[INTELLIGENCE_METRICS].snapshot()["completed_requests"], 2)
