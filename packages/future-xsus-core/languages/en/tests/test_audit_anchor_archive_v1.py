import hashlib
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from languages.en.learning.audit_hash_chain_v1 import SQLiteAuditHashChainV1
from languages.en.learning.audit_head_anchor_v1 import create_audit_head_anchor_v1
from languages.en.learning.audit_anchor_archive_v1 import (
    archive_audit_anchor_v1, verify_archived_audit_anchor_v1, list_audit_anchor_versions_v1,
)


class AuditAnchorArchiveV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name) / "archive"
        self.chain = SQLiteAuditHashChainV1(Path(self.tmp.name) / "chain.sqlite")
        self.owner = "alice"
        self.cid = hashlib.sha256(b"versioned-anchor").hexdigest()
        self.key = b"k" * 32
        self.chain.append(self.owner, self.cid, 1, "blocked")

    def anchor(self):
        return create_audit_head_anchor_v1(self.chain, self.owner, self.cid, self.key)

    def save(self, version="v1", anchor=None):
        return archive_audit_anchor_v1(
            self.root, version, self.owner, self.cid, self.anchor() if anchor is None else anchor,
            chain=self.chain, secret_key=self.key,
        )

    def verify(self, version="v1"):
        return verify_archived_audit_anchor_v1(
            self.root, version, self.owner, self.cid, chain=self.chain, secret_key=self.key
        )

    def test_archive_first_version(self):
        self.assertTrue(self.save().is_file())

    def test_first_version_verifies(self):
        self.save()
        self.assertEqual(self.verify()["status"], "consistent_at_check")

    def test_version_returned(self):
        self.save()
        self.assertEqual(self.verify()["archive_version"], "v1")

    def test_no_overwrite(self):
        self.save()
        with self.assertRaises(FileExistsError):
            self.save()

    def test_second_version(self):
        self.save()
        self.save("v2")
        self.assertEqual(list_audit_anchor_versions_v1(self.root, self.owner, self.cid), ("v1", "v2"))

    def test_sorted_numeric_versions(self):
        self.save("v10")
        self.save("v2")
        self.assertEqual(list_audit_anchor_versions_v1(self.root, self.owner, self.cid), ("v2", "v10"))

    def test_empty_archive(self):
        self.assertEqual(list_audit_anchor_versions_v1(self.root, self.owner, self.cid), ())

    def test_version_isolation(self):
        self.save("v2")
        with self.assertRaises(FileNotFoundError):
            self.verify("v1")

    def test_missing_version(self):
        with self.assertRaises(FileNotFoundError):
            self.verify("v8")

    def test_invalid_version(self):
        for value in ("", "../v1", "v0", "v01", "V1", "v1/../v2", 1, "v1234567890"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                self.save(value)

    def test_invalid_version_read(self):
        with self.assertRaises(ValueError):
            self.verify("../v1")

    def test_invalid_version_list_excludes_other_names(self):
        self.save("v1")
        (self.root / "checkpoints" / "notes").mkdir()
        self.assertEqual(list_audit_anchor_versions_v1(self.root, self.owner, self.cid), ("v1",))

    def test_stale_anchor_rejected_for_new_version(self):
        old = self.anchor()
        self.chain.append(self.owner, self.cid, 2, "blocked")
        with self.assertRaises(ValueError):
            self.save("v2", old)

    def test_tampered_anchor_rejected_before_save(self):
        altered = {**self.anchor(), "head": "a"*64}
        with self.assertRaises(ValueError):
            self.save("v1", altered)

    def test_wrong_key_rejected(self):
        with self.assertRaises(ValueError):
            archive_audit_anchor_v1(self.root, "v1", self.owner, self.cid, self.anchor(),
                                    chain=self.chain, secret_key=b"x"*32)

    def test_append_invalidates_old_checkpoint(self):
        self.save("v1")
        self.chain.append(self.owner, self.cid, 2, "blocked")
        self.assertEqual(self.verify("v1")["status"], "inconsistent_or_untrusted")

    def test_new_version_after_append(self):
        self.save("v1")
        self.chain.append(self.owner, self.cid, 2, "blocked")
        self.save("v2")
        self.assertEqual(self.verify("v2")["status"], "consistent_at_check")

    def test_old_version_preserved(self):
        first = self.save("v1")
        original = first.read_bytes()
        self.chain.append(self.owner, self.cid, 2, "blocked")
        self.save("v2")
        self.assertEqual(first.read_bytes(), original)

    def test_scope_isolation(self):
        self.save()
        self.assertEqual(list_audit_anchor_versions_v1(self.root, "bob", self.cid), ())

    def test_release_never_authorized(self):
        self.save()
        self.assertFalse(self.verify()["release_authorized"])

    def test_not_external_trust(self):
        self.save()
        self.assertFalse(self.verify()["independent_trust_boundary"])

    def test_reopen_chain(self):
        self.save()
        reopened = SQLiteAuditHashChainV1(self.chain.path)
        result = verify_archived_audit_anchor_v1(
            self.root, "v1", self.owner, self.cid, chain=reopened, secret_key=self.key
        )
        self.assertEqual(result["status"], "consistent_at_check")
