import unittest
from languages.sq.project_context import ProjectContext, update_project
from core.routing.sq_hyper_bridge import prepare_review, request_review

def peer(request):
    return {**{k: request[k] for k in ("schema_version", "project_id", "revision", "snapshot_digest")},
            "status": "accepted", "findings": []}

class HyperBridgeTests(unittest.TestCase):
    def setUp(self):
        self.context = update_project(ProjectContext("p1"), "p1", 0, "Krijo aplikacion Android").context

    def test_snapshot(self):
        request = prepare_review(self.context)
        self.assertEqual(request["specification"]["application"]["platform"], "android")
        self.assertEqual(request, prepare_review(self.context))
        self.assertFalse(request["execution_authorized"])

    def test_roundtrip(self):
        self.assertEqual(request_review(self.context, peer)["status"], "accepted")
        self.assertFalse(request_review(self.context, peer)["execution_authorized"])

    def test_mismatch(self):
        for key, value in (("project_id", "p2"), ("revision", 2), ("snapshot_digest", "bad"), ("schema_version", "2.0")):
            with self.subTest(key=key), self.assertRaises(ValueError):
                request_review(self.context, lambda r: {**peer(r), key: value})

    def test_invalid_response(self):
        for response in (None, {}, {"status": "accepted"}):
            with self.assertRaises(ValueError):
                request_review(self.context, lambda r: response)

    def test_no_authorization(self):
        with self.assertRaises(ValueError):
            request_review(self.context, lambda r: {**peer(r), "execution_authorized": True})

    def test_incomplete(self):
        with self.assertRaises(ValueError):
            prepare_review(ProjectContext("p1"))

    def test_transport_failure(self):
        def fail(request):
            raise TimeoutError("unavailable")
        with self.assertRaises(TimeoutError):
            request_review(self.context, fail)
