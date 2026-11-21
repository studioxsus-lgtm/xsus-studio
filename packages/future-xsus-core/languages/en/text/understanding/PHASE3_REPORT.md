# Future XSUS Core — Phase 3 (in progress)

Phase 2 engineering acceptance was verified green at commit `bb32d8b9`
on branch `future-xsus-core`. That acceptance covers only bounded,
authored, controlled-English diagnostics, not open-domain comprehension.

## Phase 3.1 — Bounded action semantics

`action_semantics_v1.py` introduces a deterministic mapping for the
11 actions already recognized by the controlled sentence parser:

- `read`, `review` → `information_access`
- `check`, `test` → `verification`
- `write`, `create` → `content_creation`
- `build` → `construction`
- `open` → `access`
- `send` → `transfer`
- `update` → `modification`
- `delete` → `removal`

The classifier reuses the existing sentence parser, preserves explicit
polarity, and abstains on unsupported inputs. It does not infer intent,
truth, causation, entailment, temporal scope, or broad word meanings.

```bash
python -m unittest languages.en.tests.test_action_semantics_v1 -v
```

**Release status:** Phase 3 is experimental and not production authorized.
The next milestones are adversarial category evaluation, semantic contrast
tests, and a separate Phase 3 quality gate. Future XSUS Core remains
independent of Hyper XSUS Core, XSUS AI Core, and the main website.
