import hashlib
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from languages.en.learning.audit_hash_chain_v1 import SQLiteAuditHashChainV1
from languages.en.learning.audit_head_anchor_v1 import create_audit_head_anchor_v1
from languages.en.learning.audit_anchor_store_v1 import (
    save_audit_anchor_v1, load_audit_anchor_v1, verify_stored_audit_anchor_v1,
)


class AuditAnchorStoreV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.root = root / "anchors"
        self.chain = SQLiteAuditHashChainV1(root / "chain.sqlite")
        self.owner = "alice"
        self.cid = hashlib.sha256(b"anchor-store").hexdigest()
        self.key = b"s" * 32
        self.chain.append(self.owner, self.cid, 1, "blocked")
        self.anchor = create_audit_head_anchor_v1(self.chain, self.owner, self.cid, self.key)

    def save(self, anchor=None):
        return save_audit_anchor_v1(self.root, self.owner, self.cid,
                                    self.anchor if anchor is None else anchor)

    def verify(self):
        return verify_stored_audit_anchor_v1(
            self.chain, self.root, self.owner, self.cid, self.key
        )

    def test_save_and_load(self):
        self.save()
        self.assertEqual(load_audit_anchor_v1(self.root, self.owner, self.cid), self.anchor)

    def test_saved_anchor_verifies(self):
        self.save()
        self.assertEqual(self.verify()["status"], "consistent_at_check")

    def test_exclusive_create(self):
        self.save()
        with self.assertRaises(FileExistsError):
            self.save()

    def test_no_overwrite_after_append(self):
        self.save()
        self.chain.append(self.owner, self.cid, 2, "blocked")
        with self.assertRaises(FileExistsError):
            self.save()

    def test_appended_chain_detected(self):
        self.save()
        self.chain.append(self.owner, self.cid, 2, "blocked")
        self.assertIn("anchor_count_mismatch", self.verify()["reasons"])

    def test_missing_file(self):
        with self.assertRaises(FileNotFoundError):
            self.verify()

    def test_wrong_key(self):
        self.save()
        result = verify_stored_audit_anchor_v1(
            self.chain, self.root, self.owner, self.cid, b"x" * 32
        )
        self.assertIn("anchor_signature_invalid", result["reasons"])

    def test_scope_mismatch_rejected(self):
        wrong = {**self.anchor, "owner_id": "bob"}
        with self.assertRaises(ValueError):
            self.save(wrong)

    def test_non_dict_rejected(self):
        with self.assertRaises(ValueError):
            self.save([])

    def test_corrupt_json(self):
        path = self.save()
        path.write_text("{")
        with self.assertRaises(ValueError):
            self.verify()

    def test_modified_signature(self):
        import json
        path = self.save()
        modified = {**self.anchor, "signature": "a"*64}
        path.write_text(json.dumps(modified))
        self.assertIn("anchor_signature_invalid", self.verify()["reasons"])

    def test_oversized_file(self):
        path = self.save()
        path.write_bytes(b"x" * 4097)
        with self.assertRaises(ValueError):
            self.verify()

    def test_symlink_file_rejected(self):
        path = self.save()
        path.unlink()
        path.symlink_to(self.chain.path)
        with self.assertRaises(ValueError):
            self.verify()

    def test_local_only_flag(self):
        self.save()
        self.assertFalse(self.verify()["independent_trust_boundary"])

    def test_release_denied(self):
        self.save()
        self.assertFalse(self.verify()["release_authorized"])

    def test_separate_paths(self):
        self.assertNotEqual(self.save(), self.chain.path)

    def test_reopen_chain(self):
        self.save()
        reopened = SQLiteAuditHashChainV1(self.chain.path)
        result = verify_stored_audit_anchor_v1(
            reopened, self.root, self.owner, self.cid, self.key
        )
        self.assertEqual(result["status"], "consistent_at_check")

    def test_owner_isolation(self):
        self.save()
        with self.assertRaises(FileNotFoundError):
            load_audit_anchor_v1(self.root, "bob", self.cid)
