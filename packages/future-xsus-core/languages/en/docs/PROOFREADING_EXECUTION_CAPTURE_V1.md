# English Proofreading Execution Capture V1

Read a fixed labeled JSONL dataset, invoke the actual supplied
proofreading callable once per input (never pass expected labels),
and produce a canonical HMAC-SHA256 signed prediction artifact
containing the SHA-256 digest of the exact dataset bytes.

The callable is injectable for deterministic contract testing; the
default is the English proofreader. The result proves only that the
local function returned those observations in this process. It does
**not** attest to the engine binary, model identity, external execution,
secret dataset isolation, or signer identity. HMAC keys must be
managed outside source control. No training or automatic release.

Run from `packages/future-xsus-core`:
`python3 -m unittest languages.en.tests.test_proofreading_execution_capture_v1 -v`
