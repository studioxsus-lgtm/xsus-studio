import unittest
from languages.sq.project_context import ProjectContext, update_project
from core.routing.sq_hyper_bridge import request_review
from core.routing.sq_build_bridge import prepare_build_plan, request_build_plan

KEYS = ("schema_version", "project_id", "revision", "snapshot_digest")

def review_peer(r):
    return {**{k: r[k] for k in KEYS}, "status": "accepted", "findings": []}

def build_peer(r):
    return {**{k: r[k] for k in KEYS}, "status": "planned", "plan_id": "plan-1"}

class BuildBridgeTests(unittest.TestCase):
    def setUp(self):
        self.context = update_project(ProjectContext("p1"), "p1", 0, "Krijo aplikacion Android").context
        self.review = request_review(self.context, review_peer)

    def test_handoff(self):
        r = prepare_build_plan(self.context, self.review)
        self.assertEqual(r["destination"], "future-xsus-app-build-engine")
        self.assertEqual(r["operation"], "application.plan")
        self.assertFalse(r["execution_authorized"])

    def test_roundtrip(self):
        r = request_build_plan(self.context, self.review, build_peer)
        self.assertEqual(r["plan_id"], "plan-1")
        self.assertFalse(r["execution_authorized"])

    def test_review_gate(self):
        for status in ("rejected", "needs_changes"):
            with self.assertRaises(ValueError):
                prepare_build_plan(self.context, {**self.review, "status": status})

    def test_stale_review(self):
        updated = update_project(self.context, "p1", 1, "Krijo dizajn modern").context
        with self.assertRaises(ValueError):
            prepare_build_plan(updated, self.review)

    def test_mismatch(self):
        for key, value in (("project_id", "p2"), ("revision", 2), ("snapshot_digest", "bad")):
            with self.assertRaises(ValueError):
                request_build_plan(self.context, self.review, lambda r: {**build_peer(r), key: value})

    def test_invalid_plan(self):
        for value in ("", None, 123):
            with self.assertRaises(ValueError):
                request_build_plan(self.context, self.review, lambda r: {**build_peer(r), "plan_id": value})

    def test_unsupported(self):
        r = request_build_plan(self.context, self.review, lambda r: {**build_peer(r), "status": "unsupported", "plan_id": None})
        self.assertIsNone(r["plan_id"])

    def test_no_execution(self):
        with self.assertRaises(ValueError):
            prepare_build_plan(self.context, {**self.review, "execution_authorized": True})

    def test_no_artifact_claim(self):
        with self.assertRaises(ValueError):
            request_build_plan(self.context, self.review, lambda r: {**build_peer(r), "artifact_id": "apk"})
