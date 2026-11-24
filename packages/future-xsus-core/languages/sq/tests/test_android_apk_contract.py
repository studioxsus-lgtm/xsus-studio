import unittest
import hashlib
from languages.sq.project_context import ProjectContext, update_project
from core.routing.sq_android_persistence_security import prepare_persistence_security
from core.routing.sq_android_apk_contract import prepare_apk_request, verify_artifact_integrity

class APKContractTests(unittest.TestCase):
    def plan(self, prompt="Krijo aplikacion Android"):
        context = update_project(ProjectContext("p1"),"p1",0,prompt).context
        return prepare_persistence_security(context,"com.xsus.app","XSUS")

    def setUp(self):
        self.request = prepare_apk_request(self.plan())
        self.data = b"synthetic test bytes, not an APK"
        self.receipt = {"plan_digest":self.request["plan_digest"],"status":"completed",
                        "sha256":hashlib.sha256(self.data).hexdigest(),"size":len(self.data),"kind":"apk"}

    def test_request(self):
        self.assertEqual(self.request["gradle_task"],":app:assembleDebug")
        self.assertFalse(self.request["execution_authorized"])

    def test_deterministic(self):
        self.assertEqual(self.request,prepare_apk_request(self.plan()))

    def test_unresolved(self):
        with self.assertRaises(ValueError):
            prepare_apk_request(self.plan("Krijo aplikacion Android me autentikim"))

    def test_integrity_not_validity(self):
        result = verify_artifact_integrity(self.request,self.receipt,self.data)
        self.assertTrue(result["integrity_matches"])
        self.assertFalse(result["apk_validated"])
        self.assertFalse(result["signature_verified"])
        self.assertFalse(result["installation_verified"])

    def test_mismatch(self):
        for key,value in (("plan_digest","other"),("status","failed"),("kind","html"),("size",1),("sha256","wrong")):
            with self.assertRaises(ValueError):
                verify_artifact_integrity(self.request,{**self.receipt,key:value},self.data)

    def test_modified_bytes(self):
        with self.assertRaises(ValueError):
            verify_artifact_integrity(self.request,self.receipt,b"x"*len(self.data))

    def test_extra_fields(self):
        with self.assertRaises(ValueError):
            verify_artifact_integrity(self.request,{**self.receipt,"verified":True},self.data)

    def test_empty(self):
        with self.assertRaises(ValueError):
            verify_artifact_integrity(self.request,self.receipt,b"")
