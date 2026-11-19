# English spelling data

`spelling-v1.json` is a small, reviewed mapping from lowercase misspellings
to lowercase corrections. It is data for the deterministic copyeditor; it is
not a learned or general-purpose English dictionary.

The copyeditor applies a spelling candidate only when its existing English
clause verifier accepts the corrected sentence. Unrecognized sentence forms,
all-capital tokens, mixed-case names, and corrections that conflict with a
grammar edit remain unchanged for review.

When changing this file:

1. Add one unambiguous lowercase source form and one lowercase correction.
2. Keep each correction to one token; multiword rewrites need a separate rule.
3. Add an independently written case to `evaluation/copyediting-v1.jsonl`.
4. Run the English copyediting and full package test suites.

The JSON loader rejects duplicate keys, malformed forms, identity mappings,
and non-lowercase values. The copyediting evaluation currently contains 144
cases, including at least one case for every spelling entry.
