import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError


class APIProcessRecoveryTests(unittest.TestCase):
    def test_committed_session_survives_process_kill(self):
        with tempfile.TemporaryDirectory() as directory:
            with socket.socket() as sock:
                sock.bind(("127.0.0.1", 0))
                port = sock.getsockname()[1]
            base = f"http://127.0.0.1:{port}"
            token = "recovery-test-token-01234567890123456789"
            env = dict(os.environ, XSUS_API_TOKEN=token,
                       XSUS_INTELLIGENCE_ENABLED="true",
                       XSUS_LEARNING_WORKER_ENABLED="false")
            for name in ("XSUS_SUPABASE_URL", "XSUS_SUPABASE_PUBLISHABLE_KEY"):
                env.pop(name, None)

            def call(path, method="GET", payload=None, credential=token):
                headers = {"Authorization": "Bearer " + credential}
                data = None
                if payload is not None:
                    data = json.dumps(payload).encode()
                    headers["Content-Type"] = "application/json"
                with urlopen(Request(base + path, data=data, headers=headers,
                                     method=method), timeout=2) as response:
                    return json.load(response)

            def start():
                process = subprocess.Popen(
                    [sys.executable, "-m", "services.api.server", "--database",
                     str(Path(directory) / "sessions.db"), "--port", str(port)],
                    env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                self.addCleanup(stop, process)
                deadline = time.monotonic() + 10
                while time.monotonic() < deadline:
                    if process.poll() is not None:
                        self.fail("API exited before readiness")
                    try:
                        if call("/healthz")["status"] == "ok":
                            return process
                    except (URLError, TimeoutError):
                        time.sleep(.05)
                self.fail("API readiness timeout")

            def stop(process):
                if process.poll() is None:
                    process.kill()
                process.wait(timeout=5)

            first = start()
            snapshot = call("/v1/sessions", "POST")
            session = "/v1/sessions/" + snapshot["session_id"]
            # Commit a real conversation exchange before the crash.
            call(session + "/messages", "POST",
                 {"text": "Hello", "language": "en", "expected_revision": snapshot["revision"]})
            committed = call(session)
            self.assertGreater(committed["revision"], snapshot["revision"])
            self.assertTrue(committed["history"])
            stop(first)
            second = start()
            self.assertEqual(call(session), committed)
            with self.assertRaises(HTTPError) as denied:
                call(session, credential="invalid")
            self.assertEqual(denied.exception.code, 401)
            result = call("/v1/intelligence/reason", "POST",
                          {"contractVersion": "1.0.0", "requestId": "recovery",
                           "query": "done", "facts": ["done"], "rules": []})
            self.assertEqual(result["status"], "resolved")
            self.assertFalse(result["executionAuthorized"])
            stop(second)
