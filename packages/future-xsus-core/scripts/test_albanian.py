#!/usr/bin/env python3
"""Phase 13: run isolated Albanian foundation and integration tests."""
import os
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
env = dict(os.environ)
env["PYTHONPATH"] = str(ROOT) + os.pathsep + env.get("PYTHONPATH", "")
command = [
    sys.executable, "-m", "unittest", "discover",
    "-s", str(ROOT / "languages" / "sq" / "tests"),
    "-p", "test_*.py", "-v",
]
print("Running Albanian suite:", " ".join(command), flush=True)
raise SystemExit(subprocess.call(command, cwd=ROOT, env=env))
