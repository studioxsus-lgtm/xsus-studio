import unittest
from services.api.security_review_v1 import review_inventory
from services.api.production_acceptance_v1 import EXTERNAL_GATES

class SecurityReviewTests(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(review_inventory({})["missing"],7)
    def test_reported_pass_never_authorizes(self):
        report=review_inventory({g:{"commit":"a"*40,"digest":"b"*64,"outcome":"pass"} for g in EXTERNAL_GATES})
        self.assertEqual(report["missing"],0)
        self.assertFalse(report["production_ready"])
        self.assertFalse(report["deployment_authorized"])
    def test_fail(self):
        report=review_inventory({EXTERNAL_GATES[0]:{"commit":"a"*40,"digest":"b"*64,"outcome":"fail"}})
        self.assertEqual(report["reported_failures"],1)
    def test_unknown(self):
        with self.assertRaises(ValueError):
            review_inventory({"unknown":{}})
    def test_invalid_digest(self):
        with self.assertRaises(ValueError):
            review_inventory({EXTERNAL_GATES[0]:{"commit":"a"*40,"digest":"bad","outcome":"pass"}})
    def test_extra_private_fields_rejected(self):
        with self.assertRaises(ValueError):
            review_inventory({EXTERNAL_GATES[0]:{"commit":"a"*40,"digest":"b"*64,"outcome":"pass","token":"example"}})
